'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, MessageSquare, Search, Key, Send, X, Loader2, 
  ShoppingBag, Flame, CheckCircle, AlertCircle, RefreshCw, ChevronRight, Tag
} from 'lucide-react';
import { aiChatRagApi, semanticSearchApi, configGeminiKeyApi, getAiStatusApi, syncAiEmbeddingsApi } from '@/services/api';
import { AiChatResponse, SemanticProductItem, Product } from '@/types';
import { useApp } from '@/context/AppContext';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const { addToCart } = useApp();
  const [activeTab, setActiveTab] = useState<'chat' | 'vector_search' | 'config'>('chat');
  
  // Chat state
  const [query, setQuery] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<AiChatResponse | null>(null);
  
  // Vector search state
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedKeyword, setLastSearchedKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [vectorItems, setVectorItems] = useState<SemanticProductItem[]>([]);
  
  // Config state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Suggested quick prompts
  const quickPrompts = [
    '🥦 Rau nào nấu canh ngọt giải nhiệt mùa hè?',
    '🍲 Combo rau củ quả nhúng lẩu tươi ngon',
    '🥗 Gợi ý rau củ ăn giảm cân giữ dáng',
    '🏷️ Hôm nay có rau củ nào đang ưu đãi giá tốt?'
  ];

  useEffect(() => {
    const savedLocalKey = typeof window !== 'undefined' ? localStorage.getItem('hona_gemini_api_key') : null;
    if (savedLocalKey) {
      setApiKeyInput(savedLocalKey);
    }

    if (isOpen) {
      getAiStatusApi()
        .then(async res => {
          setHasGeminiKey(res.hasGeminiKey);
          // Nếu backend chưa có key nhưng trong trình duyệt đã lưu trước đó, tự động đồng bộ lên backend
          if (!res.hasGeminiKey && savedLocalKey) {
            const ok = await configGeminiKeyApi(savedLocalKey);
            setHasGeminiKey(ok);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || query;
    if (!text.trim() || loading) return;

    const trimmed = text.trim();
    setUserQuestion(trimmed);
    setQuery(''); // Tự động xóa text trong ô input ngay khi gửi

    setLoading(true);
    try {
      const res = await aiChatRagApi(trimmed);
      setChatResponse(res);
      setHasGeminiKey(res.hasGeminiKey);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi kết nối với AI');
    } finally {
      setLoading(false);
    }
  };

  const handleVectorSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;
    const q = searchQuery.trim();
    setLastSearchedKeyword(q);
    setSearchQuery(''); // Tự động xóa text trong ô tìm kiếm khi bấm tìm
    setSearchLoading(true);
    try {
      const res = await semanticSearchApi(q, 8);
      setVectorItems(res.items);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tìm kiếm vector');
    } finally {
      setSearchLoading(false);
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
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg tracking-wide">HoNa Fresh AI & Vector Search</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/50 border border-emerald-300/40 text-emerald-100 flex items-center gap-1">
                  PostgreSQL pgvector + Gemini
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">
                Trợ lý ẩm thực RAG: Lọc vector nông sản → Gemini tư vấn & gợi ý giá tốt
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 bg-slate-50 border-b border-slate-200/80 text-sm font-medium">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Trợ Lý Ẩm Thực RAG
          </button>
          <button
            onClick={() => setActiveTab('vector_search')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'vector_search'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            Tìm Kiếm Vector (pgvector)
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition-all ml-auto ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Cấu hình Gemini Key
            {hasGeminiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: RAG CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              
              {/* Prompt Suggestions */}
              {!chatResponse && !loading && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Gợi ý câu hỏi nhanh:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(p.replace(/^[^\s]+\s/, ''));
                          handleSendChat(p.replace(/^[^\s]+\s/, ''));
                        }}
                        className="text-left text-xs sm:text-sm p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition-all shadow-sm"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Question Bubble */}
              {userQuestion && (
                <div className="flex justify-end animate-in fade-in">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-emerald-700 text-white text-xs sm:text-sm font-medium shadow-sm flex items-center gap-2">
                    <span>{userQuestion}</span>
                  </div>
                </div>
              )}

              {/* Chat Response Area */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-sm font-medium animate-pulse">
                    Đang tìm kiếm vector trong pgvector & tham vấn Gemini AI...
                  </p>
                </div>
              )}

              {chatResponse && !loading && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* AI Answer Bubble */}
                  <div className="p-5 rounded-3xl bg-emerald-50/60 border border-emerald-200/70 text-slate-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-sm text-emerald-900">Tư Vấn Từ HoNa Fresh AI</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                        {chatResponse.modelUsed}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
                      {chatResponse.answer}
                    </div>
                  </div>

                  {/* Recommended Products via Vector Search */}
                  {chatResponse.recommendedProducts?.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-sm text-slate-800">
                          Nông Sản Phù Hợp Trích Xuất Bằng pgvector:
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {chatResponse.recommendedProducts.map((p) => (
                          <div
                            key={p.id}
                            className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div className="flex gap-3">
                              <img
                                src={p.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'}
                                alt={p.name}
                                className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-xs text-slate-800 line-clamp-1">{p.name}</h5>
                                <p className="text-[11px] text-slate-500 line-clamp-1">{p.origin || 'Đà Lạt'}</p>
                                <p className="text-emerald-700 font-bold text-xs mt-1">
                                  {Number(p.price).toLocaleString('vi-VN')} đ <span className="text-[10px] font-normal text-slate-500">/{p.unit}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                addToCart(p, 1);
                                alert(`Đã thêm ${p.name} vào giỏ hàng!`);
                              }}
                              className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Thêm vào giỏ
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hot Deals Section */}
                  {chatResponse.hotDeals?.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <h4 className="font-bold text-sm text-slate-800">
                          Ưu Đãi & Giá Tốt Kèm Theo Hôm Nay:
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {chatResponse.hotDeals.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 bg-gradient-to-br from-amber-50/50 to-orange-50/40 rounded-2xl border border-orange-200/80 flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase">
                                Hot Deal
                              </span>
                              <h5 className="font-semibold text-xs text-slate-800 truncate mt-1">{d.name}</h5>
                              <p className="text-orange-600 font-bold text-xs">
                                {Number(d.price).toLocaleString('vi-VN')} đ
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                addToCart(d, 1);
                                alert(`Đã thêm ${d.name} vào giỏ!`);
                              }}
                              className="p-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0 transition-colors shadow-sm"
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VECTOR SEARCH ONLY */}
          {activeTab === 'vector_search' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">🔍 Tìm kiếm ngữ nghĩa bằng vector Cosine Similarity:</p>
                <p>
                  Bạn không cần nhớ chính xác tên sản phẩm! Hãy nhập tự do theo mục đích ẩm thực hoặc dinh dưỡng:
                  <br />
                  <span className="italic text-emerald-700">"rau giòn xào thịt bò"</span>, <span className="italic text-emerald-700">"rau mát nấu canh chua"</span>, <span className="italic text-emerald-700">"củ quả bùi ngọt cho bé ăn dặm"</span>.
                </p>
              </div>

              {/* Vector Search Box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVectorSearch()}
                  placeholder="Nhập nhu cầu ẩm thực (VD: rau giải nhiệt, nấm nhúng lẩu...)"
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button
                  onClick={handleVectorSearch}
                  disabled={searchLoading}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Tìm Vector
                </button>
              </div>

              {/* Vector Results */}
              {vectorItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-sm text-slate-800">
                      Kết quả tương đồng ngữ nghĩa (pgvector Cosine Distance):
                    </h4>
                    {lastSearchedKeyword && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                        Từ khóa: <strong>"{lastSearchedKeyword}"</strong>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vectorItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex gap-3"
                      >
                        <img
                          src={item.product.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-semibold text-xs text-slate-800 truncate">{item.product.name}</h5>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex-shrink-0">
                              Khớp {Math.round(item.similarity * 100)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.product.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-emerald-700 font-bold text-xs">
                              {Number(item.product.price).toLocaleString('vi-VN')} đ/{item.product.unit}
                            </span>
                            <button
                              onClick={() => {
                                addToCart(item.product, 1);
                                alert(`Đã thêm ${item.product.name} vào giỏ!`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                            >
                              Chọn mua
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFIG GEMINI API KEY */}
          {activeTab === 'config' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Cấu hình Google Gemini API Key</h4>
                    <p className="text-xs text-slate-500">Mượn trí thông minh của Gemini 1.5 Flash & text-embedding-004</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Gemini API Key (Google AI Studio):</label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Dán AIzaSy... vào đây"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    💡 Bạn có thể lấy 1 API Key <strong>hoàn toàn miễn phí</strong> tại:{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-semibold underline"
                    >
                      Google AI Studio (aistudio.google.com)
                    </a>
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors"
                  >
                    Lưu & Kích Hoạt Key
                  </button>
                  <button
                    onClick={handleSyncVector}
                    disabled={syncing}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Đồng bộ lại Vector
                  </button>
                </div>

                {configMsg && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 animate-in fade-in">
                    {configMsg}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Input Bar (cho tab chat) */}
        {activeTab === 'chat' && (
          <div className="p-4 bg-slate-50 border-t border-slate-200/80">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Hỏi HoNa Fresh AI về món ăn, rau sạch hoặc giá tốt..."
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={loading || !query.trim()}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
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
