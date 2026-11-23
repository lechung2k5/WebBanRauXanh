'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, MessageSquare, Key, Send, X, Loader2, 
  ShoppingBag, Flame, RefreshCw, RotateCcw, MapPin
} from 'lucide-react';
import { aiChatRagApi, configGeminiKeyApi, getAiStatusApi, syncAiEmbeddingsApi, getProducts } from '@/services/api';
import { AiChatResponse, Product } from '@/types';
import { useApp } from '@/context/AppContext';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedProducts?: Product[];
  hotDeals?: Product[];
  timestamp: string;
}

/**
 * Component định dạng font chữ và trình bày văn bản câu trả lời từ AI
 */
function FormattedAnswer({ text }: { text: string }) {
  const lines = text.split('\n');

  const parseInlineStyles = (content: string) => {
    // Tách bold **text** và inline code `text`
    const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-[#10542C]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <span
            key={i}
            className="inline-block px-2 py-0.5 mx-0.5 rounded-md bg-emerald-100 text-emerald-900 font-mono text-xs font-bold"
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-[#2C3E2E] font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        if (trimmed === '---') {
          return <hr key={idx} className="my-3 border-emerald-200/60" />;
        }
        if (trimmed.startsWith('###')) {
          const headerText = trimmed.replace(/^###\s*/, '');
          return (
            <div
              key={idx}
              className="font-heading font-black text-xs sm:text-sm text-[#10542C] pt-2 pb-1.5 border-b border-emerald-100/80 flex items-center gap-1.5"
            >
              {parseInlineStyles(headerText)}
            </div>
          );
        }
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^[\*\-]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10542C] mt-2 shrink-0"></span>
              <div className="flex-1 text-xs sm:text-sm text-[#2C3E2E] leading-relaxed">
                {parseInlineStyles(itemText)}
              </div>
            </div>
          );
        }
        return (
          <p key={idx} className="text-xs sm:text-sm text-[#2C3E2E] leading-relaxed">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const { addToCart } = useApp();
  const [activeTab, setActiveTab] = useState<'chat' | 'config'>('chat');
  
  // Chat state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // Config state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Suggested quick prompts B2B
  const quickPrompts = [
    '🌾 Sắp tới nông sản nào tại Đà Lạt & Lâm Đồng vào mùa thu hoạch rầm rộ?',
    '📦 Báo giá sỉ lô rau ăn lá số lượng lớn (≥ 2 Tấn) giao kho Chợ Đầu Mối?',
    '🍄 Tôi muốn tìm các sản phẩm nông sản và nấm tại Đồng Nai',
    '📜 Danh sách các Hợp tác xã đạt chuẩn VietGAP và có mã số vùng trồng PUC?'
  ];

  // Danh sách các vùng trồng chuyên canh B2B thực tế trong CSDL HoNa Fresh (17 HTX)
  const REGION_SHORTCUTS = [
    { name: 'Đồng Nai', label: '📍 Đồng Nai', count: '10 lô Nấm', prompt: 'Tôi muốn tìm các sản phẩm nông sản và nấm tại Đồng Nai' },
    { name: 'Đắk Lắk', label: '📍 Đắk Lắk', count: '108 lô Buôn Hồ', prompt: 'Tìm nguồn cung nông sản sỉ tại Buôn Hồ Đắk Lắk' },
    { name: 'Đà Lạt & Lâm Đồng', label: '📍 Đà Lạt & Lâm Đồng', count: '317 lô rau củ', prompt: 'Sắp tới nông sản nào tại Đà Lạt & Lâm Đồng vào mùa thu hoạch rầm rộ?' },
    { name: 'Gia Lai', label: '📍 Gia Lai', count: '100 lô Chư Prông', prompt: 'Báo giá sỉ nông sản hữu cơ tại Chư Prông Gia Lai' },
    { name: 'Mộc Châu', label: '📍 Mộc Châu - Sơn La', count: '7 lô', prompt: 'Tìm nguồn su su, củ tỏi và cải mèo Mộc Châu Sơn La' },
    { name: 'Hải Dương & Quảng Ninh', label: '📍 Hải Dương & Quảng Ninh', count: '43 lô', prompt: 'Tìm nguồn cà rốt và hành tỏi tại Hải Dương và Quảng Ninh' },
    { name: 'Miền Tây', label: '📍 Miền Tây', count: '36 lô ĐBSCL', prompt: 'Tìm nguồn rau màu và nông sản tại các tỉnh Miền Tây' },
  ];

  // Từ điển nhận diện khu vực theo 17 vùng trồng thực tế
  const REGION_DICTIONARY: { [key: string]: string } = {
    'đồng nai': 'Đồng Nai',
    'dong nai': 'Đồng Nai',
    'long khánh': 'Long Khánh',
    'long khanh': 'Long Khánh',
    'đắk lắk': 'Đắk Lắk',
    'dak lak': 'Đắk Lắk',
    'daklak': 'Đắk Lắk',
    'buôn hồ': 'Buôn Hồ',
    'buon ho': 'Buôn Hồ',
    'đà lạt': 'Đà Lạt',
    'da lat': 'Đà Lạt',
    'lâm đồng': 'Lâm Đồng',
    'lam dong': 'Lâm Đồng',
    'đơn dương': 'Đơn Dương',
    'đức trọng': 'Đức Trọng',
    'gia lai': 'Gia Lai',
    'chư prông': 'Chư Prông',
    'mộc châu': 'Mộc Châu',
    'moc chau': 'Mộc Châu',
    'sơn la': 'Sơn La',
    'hải dương': 'Hải Dương',
    'nam sách': 'Nam Sách',
    'quảng ninh': 'Quảng Ninh',
    'đông triều': 'Quảng Ninh',
    'ba vì': 'Ba Vì',
    'hà nội': 'Hà Nội',
    'cần thơ': 'Cần Thơ',
    'thốt nốt': 'Thốt Nốt',
    'vĩnh long': 'Vĩnh Long',
    'tiền giang': 'Tiền Giang',
    'bến tre': 'Bến Tre',
    'củ chi': 'Củ Chi',
    'vũng tàu': 'Bà Rịa - Vũng Tàu',
  };

  // State gợi ý sản phẩm tức thì theo khu vực khi nhập liệu
  const [liveSuggestions, setLiveSuggestions] = useState<Product[]>([]);
  const [matchedRegionName, setMatchedRegionName] = useState<string | null>(null);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // Lắng nghe khi người dùng gõ vào query để tự động gợi ý sản phẩm của khu vực đó
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setLiveSuggestions([]);
      setMatchedRegionName(null);
      return;
    }

    // Kiểm tra xem query có chứa địa danh nào không
    let detectedLoc: string | null = null;
    for (const [key, loc] of Object.entries(REGION_DICTIONARY)) {
      if (trimmed.includes(key)) {
        detectedLoc = loc;
        break;
      }
    }

    setMatchedRegionName(detectedLoc);

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const keywordToSearch = detectedLoc || query.trim();
        const res = await getProducts({ keyword: keywordToSearch, size: 8 });
        if (res && res.products && res.products.length > 0) {
          setLiveSuggestions(res.products);
        } else {
          setLiveSuggestions([]);
        }
      } catch (err) {
        console.warn('Lỗi lấy gợi ý nhanh:', err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const savedLocalKey = typeof window !== 'undefined' ? localStorage.getItem('hona_gemini_api_key') : null;
    if (savedLocalKey) {
      setApiKeyInput(savedLocalKey);
    }

    if (isOpen) {
      getAiStatusApi()
        .then(async res => {
          setHasGeminiKey(res.hasGeminiKey);
          if (!res.hasGeminiKey && savedLocalKey) {
            const ok = await configGeminiKeyApi(savedLocalKey);
            setHasGeminiKey(ok);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    const trimmed = text.trim();
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // 1. Thêm tin nhắn của User vào lịch sử
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: timeNow,
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await aiChatRagApi(trimmed);
      setHasGeminiKey(res.hasGeminiKey);

      // 2. Thêm phản hồi của AI vào lịch sử
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        recommendedProducts: res.recommendedProducts,
        hotDeals: res.hotDeals,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi kết nối với Trợ Lý HoNa Fresh');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    const cleanKey = apiKeyInput.trim();
    try {
      const ok = await configGeminiKeyApi(cleanKey);
      if (ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('hona_gemini_api_key', cleanKey);
        }
        setHasGeminiKey(true);
        setConfigMsg('✅ Đã kích hoạt Google Gemini API Key và lưu vĩnh viễn!');
      } else {
        setConfigMsg('❌ API Key không hợp lệ');
      }
      setTimeout(() => setConfigMsg(''), 5000);
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hona_gemini_api_key');
      }
      setConfigMsg(`❌ ${err.message || 'Lỗi lưu API Key'}`);
      setTimeout(() => setConfigMsg(''), 6000);
    }
  };

  const handleSyncVector = async () => {
    setSyncing(true);
    try {
      const count = await syncAiEmbeddingsApi();
      setConfigMsg(`✅ Đã đồng bộ ${count} vector embedding (768 chiều) vào PostgreSQL!`);
      setTimeout(() => setConfigMsg(''), 4000);
    } catch (err: any) {
      setConfigMsg(`❌ ${err.message || 'Lỗi khi đồng bộ vector'}`);
      setTimeout(() => setConfigMsg(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg tracking-wide">Trợ Lý HoNa Fresh</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/50 border border-emerald-300/40 text-emerald-100 flex items-center gap-1">
                  Cố Vấn Sỉ B2B
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Cố vấn thu mua nông sản số lượng lớn trực tiếp từ Trang trại & HTX (Tạ, Tấn, MOQ ≥ 200kg)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="px-2.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1.5 cursor-pointer font-semibold border border-white/20"
                title="Bắt đầu phiên hội thoại mới"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hội thoại mới</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Chỉ còn 2 Tab: Chat và Cấu hình */}
        <div className="flex items-center px-6 bg-slate-50 border-b border-slate-200/80 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-[#10542C] text-[#10542C] font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#10542C]" />
            Trợ Lý HoNa Fresh
            {messages.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#10542C] text-white text-[10px] rounded-full">
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-all ml-auto cursor-pointer ${
              activeTab === 'config'
                ? 'border-[#10542C] text-[#10542C] font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Cấu hình Gemini Key
            {hasGeminiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="Đã kích hoạt AI"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Chưa kích hoạt AI"></span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              
              {/* Màn hình chào mừng & Gợi ý nhanh khi chưa có tin nhắn */}
              {messages.length === 0 && !loading && (
                <div className="space-y-5 py-4">
                  <div className="p-5 rounded-2xl bg-[#F4F7F4] border border-[#D7EED6] text-center space-y-2">
                    <h4 className="font-heading font-black text-base text-[#10542C]">
                      Chào mừng bạn đến với Cố Vấn Nguồn Hàng Sỉ HoNa Fresh!
                    </h4>
                    <p className="text-xs text-[#2C3E2E] max-w-xl mx-auto leading-relaxed">
                      Tôi được trang bị dữ liệu thời vụ, sản lượng lô và nguồn cung trực tiếp từ 17 Hợp tác xã trên toàn quốc. Hãy chọn khu vực hoặc đặt câu hỏi về mùa vụ, giá sỉ bạn cần nhập hàng.
                    </p>
                  </div>

                  {/* DANH SÁCH VÙNG TRỒNG & HỢP TÁC XÃ TRỰC TIẾP */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#10542C]" />
                        Gợi ý nguồn hàng theo Vùng Trồng & Hợp Tác Xã:
                      </p>
                      <span className="text-[11px] text-[#10542C] font-semibold">17 HTX trực tiếp toàn quốc</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {REGION_SHORTCUTS.map((reg) => (
                        <button
                          key={reg.name}
                          onClick={() => {
                            setQuery(reg.prompt);
                            handleSendChat(reg.prompt);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-[#10542C] text-[#2C3E2E] hover:text-[#10542C] text-xs font-semibold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer group"
                        >
                          <span className="text-xs group-hover:scale-110 transition-transform">📍</span>
                          <span className="font-bold">{reg.name}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                            {reg.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Gợi ý câu hỏi nhanh:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {quickPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const cleanQuery = p.replace(/^[^\s]+\s/, '');
                            setQuery(cleanQuery);
                            handleSendChat(cleanQuery);
                          }}
                          className="text-left text-xs sm:text-sm p-3.5 rounded-2xl bg-[#F9F9F5] hover:bg-[#D7EED6]/40 border border-[#EAECE8] hover:border-[#10542C]/40 text-[#2C3E2E] hover:text-[#10542C] transition-all shadow-2xs font-medium cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LỊCH SỬ TIN NHẮN (Multi-turn Conversation History) */}
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3 animate-in fade-in duration-200">
                  {/* Tin nhắn từ User */}
                  {msg.sender === 'user' && (
                    <div className="flex justify-end items-end gap-2">
                      <span className="text-[10px] text-slate-400 mb-1">{msg.timestamp}</span>
                      <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-[#10542C] text-white text-xs sm:text-sm font-medium shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {/* Tin nhắn từ Trợ lý AI */}
                  {msg.sender === 'assistant' && (
                    <div className="space-y-4">
                      {/* Bong bóng trả lời văn bản */}
                      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#F4F7F4] to-white border border-[#D7EED6] text-[#2C3E2E] space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#10542C]" />
                            <span className="font-heading font-black text-xs sm:text-sm text-[#10542C]">
                              Cố Vấn Nguồn Hàng HoNa Fresh
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Nông Trại Trực Tiếp
                            </span>
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                          </div>
                        </div>

                        {/* VĂN BẢN ĐƯỢC FORMAT TYPOGRAPHY CHUẨN */}
                        <FormattedAnswer text={msg.text} />
                      </div>

                      {/* Danh sách Lô hàng sỉ đề xuất tương ứng cho câu trả lời này */}
                      {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-[#10542C]" />
                            <h4 className="font-heading font-bold text-xs sm:text-sm text-[#2C3E2E]">
                              Lô Hàng Sỉ Đang Thu Hoạch Phù Hợp Nhu Cầu:
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {msg.recommendedProducts.map((p) => (
                              <div
                                key={p.id}
                                className="p-3 bg-white rounded-2xl border border-[#EAECE8] hover:border-[#10542C] hover:shadow-md transition-all flex flex-col justify-between"
                              >
                                <div className="flex gap-3">
                                  <img
                                    src={p.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'}
                                    alt={p.name}
                                    className="w-16 h-16 rounded-xl object-cover border border-[#EAECE8] shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-xs text-[#2C3E2E] line-clamp-1">{p.name}</h5>
                                    <p className="text-[10px] text-[#4CAF50] font-semibold line-clamp-1 mt-0.5">
                                      📍 {p.origin || p.farmLocation || 'Đà Lạt, Lâm Đồng'}
                                    </p>
                                    <div className="flex items-baseline gap-1.5 mt-1">
                                      <p className="text-[#10542C] font-black text-xs">
                                        {Number(p.price).toLocaleString('vi-VN')} đ <span className="text-[10px] font-normal text-[#6B7280]">/kg</span>
                                      </p>
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        • MOQ: {p.moq || 200}kg
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    addToCart(p, 1);
                                    alert(`Đã thêm lô ${p.name} vào danh sách đặt cọc sỉ!`);
                                  }}
                                  className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  Thêm vào lô đặt sỉ
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ưu đãi chiết khấu đi kèm */}
                      {msg.hotDeals && msg.hotDeals.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-[#FB8C00]" />
                            <h5 className="font-heading font-bold text-xs text-[#2C3E2E]">
                              Lô Chiết Khấu Sỉ Tốt Nhất Khu Vực Này:
                            </h5>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {msg.hotDeals.map((d) => (
                              <div
                                key={d.id}
                                className="p-2.5 bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-xl border border-orange-200/80 flex items-center justify-between"
                              >
                                <div className="min-w-0 pr-2">
                                  <h6 className="font-bold text-xs text-[#2C3E2E] truncate">{d.name}</h6>
                                  <p className="text-orange-600 font-black text-xs">
                                    {Number(d.price).toLocaleString('vi-VN')} đ/kg
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    addToCart(d, 1);
                                    alert(`Đã thêm lô ${d.name} vào danh sách đặt cọc sỉ!`);
                                  }}
                                  className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shrink-0 transition-colors shadow-xs cursor-pointer"
                                  title="Thêm vào lô đặt cọc"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F4F7F4] border border-[#D7EED6] text-slate-600 animate-in fade-in">
                  <Loader2 className="w-5 h-5 text-[#10542C] animate-spin" />
                  <span className="text-xs sm:text-sm font-bold text-[#10542C] animate-pulse">
                    Cố Vấn HoNa Fresh đang kiểm tra nguồn hàng & tính toán sản lượng lô...
                  </span>
                </div>
              )}

              {/* Anchor tự động cuộn xuống cuối */}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* TAB 2: CONFIG GEMINI API KEY */}
          {activeTab === 'config' && (
            <div className="space-y-6 max-w-xl mx-auto py-4">
              <div className="p-6 rounded-3xl bg-[#F9F9F5] border border-[#EAECE8] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#10542C]">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-[#2C3E2E]">Cấu hình Google Gemini API Key</h4>
                    <p className="text-xs text-[#6B7280]">Kích hoạt trí tuệ nhân tạo Gemini để hỗ trợ khách hàng</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#2C3E2E]">Gemini API Key (Google AI Studio):</label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Dán AIzaSy... hoặc AQ.Ab8... vào đây"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#EAECE8] bg-white focus:outline-none focus:ring-2 focus:ring-[#10542C] text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[11px] text-[#6B7280]">
                    💡 Bạn có thể tạo 1 API Key <strong>hoàn toàn miễn phí</strong> tại:{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#10542C] font-bold underline"
                    >
                      Google AI Studio (aistudio.google.com)
                    </a>
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Lưu & Kích Hoạt Key
                  </button>
                  <button
                    onClick={handleSyncVector}
                    disabled={syncing}
                    className="py-2.5 px-4 rounded-xl border border-[#EAECE8] bg-white hover:bg-[#F4F5F1] text-[#2C3E2E] font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Đồng bộ lại Vector
                  </button>
                </div>

                {configMsg && (
                  <div className="p-3 rounded-xl bg-white border border-[#EAECE8] text-xs text-[#2C3E2E] font-medium animate-in fade-in">
                    {configMsg}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Input Bar (cho tab chat) */}
        {activeTab === 'chat' && (
          <div className="bg-slate-50 border-t border-slate-200/80">
            {/* KHAY GỢI Ý NÔNG SẢN TỨC THÌ THEO KHU VỰC HOẶC TỪ KHÓA KHI NHẬP */}
            {(liveSuggestions.length > 0 || isSearchingSuggestions) && (
              <div className="px-5 py-3 bg-gradient-to-r from-emerald-50/95 via-[#F4F7F4] to-white border-b border-emerald-200/80 shadow-inner animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#10542C] animate-pulse" />
                    <span className="text-xs font-black text-[#10542C]">
                      {matchedRegionName 
                        ? `🌾 Gợi ý sản phẩm tại ${matchedRegionName} (${liveSuggestions.length} lô nông sản thực tế):`
                        : `🌾 Sản phẩm khớp từ khóa "${query}" (${liveSuggestions.length} lô tìm thấy):`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {matchedRegionName && (
                      <button
                        onClick={() => {
                          const fullPrompt = `Tôi muốn nhập sỉ các sản phẩm nông sản tại khu vực ${matchedRegionName}`;
                          setQuery(fullPrompt);
                          handleSendChat(fullPrompt);
                        }}
                        className="text-[11px] font-bold text-[#10542C] hover:underline cursor-pointer"
                      >
                        ⚡ Xem phân tích chi tiết vùng này →
                      </button>
                    )}
                    <button 
                      onClick={() => setLiveSuggestions([])}
                      className="text-slate-400 hover:text-slate-600 p-0.5 text-xs font-bold cursor-pointer"
                      title="Đóng gợi ý nhanh"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Danh sách thẻ card cuộn ngang */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {liveSuggestions.map((prod) => (
                    <div
                      key={prod.id}
                      className="shrink-0 w-60 p-2.5 bg-white rounded-2xl border border-emerald-100 hover:border-[#10542C] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div className="flex gap-2.5">
                        <img
                          src={prod.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200'}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h6 className="font-bold text-xs text-[#2C3E2E] truncate" title={prod.name}>
                            {prod.name}
                          </h6>
                          <p className="text-[10px] text-[#4CAF50] font-semibold truncate mt-0.5">
                            📍 {prod.origin || prod.farmLocation || 'Đà Lạt, Lâm Đồng'}
                          </p>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-[#10542C] font-black text-xs">
                              {Number(prod.price).toLocaleString('vi-VN')} đ/kg
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              MOQ: {prod.moq || 200}kg
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => {
                            const promptText = `Báo giá sỉ và thời vụ lô ${prod.name} tại ${prod.origin || 'vườn'}`;
                            setQuery(promptText);
                            handleSendChat(promptText);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#10542C] text-[10px] font-bold text-center transition-colors cursor-pointer"
                        >
                          Hỏi AI lô này
                        </button>
                        <button
                          onClick={() => {
                            addToCart(prod, 1);
                            alert(`Đã thêm lô ${prod.name} vào đơn đặt sỉ!`);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-[#10542C] hover:bg-[#0C3E20] text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          Đặt sỉ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ô nhập liệu Input */}
            <div className="p-4 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Nhập tên khu vực (Đồng Nai, Đắk Lắk, Gia Lai...) hoặc hỏi về mùa vụ, giá sỉ..."
                className="w-full flex-1 px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#10542C] text-xs sm:text-sm bg-white text-[#2C3E2E]"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={loading || !query.trim()}
                className="px-5 py-3 rounded-2xl bg-[#10542C] hover:bg-[#0C3E20] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-[#10542C]/20 shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gửi câu hỏi
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
