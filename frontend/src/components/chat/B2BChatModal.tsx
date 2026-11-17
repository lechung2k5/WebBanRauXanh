'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Image as ImageIcon,
  Loader2,
  CheckCheck,
  Clock,
  User,
  Building2,
  Sprout,
  ShieldCheck,
  Maximize2,
  Wifi,
  Sparkles,
} from 'lucide-react';
import {
  B2bChatMessage,
  getB2bChatHistory,
  sendB2bChatMessage,
  uploadB2bChatImage,
  sendB2bTypingSignal,
} from '@/services/chatApi';
import { b2bWebSocket } from '@/services/websocketService';

export interface B2BChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfq: {
    id?: number;
    rfqCode: string;
    productName?: string;
    harvestLotCode?: string;
    targetPrice?: number;
    requestedQuantity?: number;
    buyerName?: string;
    buyerCompany?: string;
    farmerName?: string;
    farmerCompany?: string;
    status?: string;
  } | null;
  currentUser: {
    id: number | string;
    name: string;
    role: 'BUYER' | 'FARMER' | 'ADMIN';
  };
}

interface ChatMessageItem extends B2bChatMessage {
  status?: 'SENDING' | 'SENT' | 'FAILED';
}

export default function B2BChatModal({
  isOpen,
  onClose,
  rfq,
  currentUser,
}: B2BChatModalProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(true);

  // Trạng thái đối tác đang soạn tin (Realtime Typing Indicator)
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerInfo = useMemo(() => {
    if (!rfq) return { name: 'Đối tác B2B', roleLabel: 'Thành viên B2B' };
    if (currentUser.role === 'BUYER') {
      return {
        name: rfq.farmerCompany || rfq.farmerName || 'Nhà Vườn / Hợp Tác Xã',
        roleLabel: 'Nhà Vườn VietGAP',
      };
    }
    return {
      name: rfq.buyerCompany || rfq.buyerName || 'Thương Lái Thu Mua',
      roleLabel: 'Bên Thu Mua B2B',
    };
  }, [rfq, currentUser.role]);

  // Nạp lịch sử tin nhắn khi mở modal (Kích hoạt Flush Redis -> Database phía Server)
  useEffect(() => {
    if (!isOpen || !rfq) return;

    let isMounted = true;
    setIsLoadingHistory(true);

    // Kiểm tra trạng thái socket
    setIsSocketConnected(b2bWebSocket.getConnected());
    const unsubConn = b2bWebSocket.onConnectionChange((connected) => {
      if (isMounted) setIsSocketConnected(connected);
    });

    // Gọi API lấy lịch sử: Backend tự động flush toàn bộ tin nhắn từ Redis sang PostgreSQL Database trước khi trả về!
    getB2bChatHistory(rfq.id, rfq.rfqCode).then((history) => {
      if (isMounted) {
        setMessages(
          history.map((m) => ({
            ...m,
            status: 'SENT',
          }))
        );
        setIsLoadingHistory(false);
      }
    });

    // Lắng nghe tin nhắn Realtime qua WebSocket STOMP
    const topicTarget = rfq.id && rfq.id > 0 ? String(rfq.id) : rfq.rfqCode;
    const unsubMsg = b2bWebSocket.subscribe(`/topic/chat/${topicTarget}`, (payload: any) => {
      if (payload && payload.rfqCode === rfq.rfqCode) {
        setMessages((prev) => {
          // Khử trùng lặp và cập nhật tin nhắn Optimistic UI
          const filtered = prev.filter(
            (m) =>
              m.id !== payload.id &&
              !(m.status === 'SENDING' && m.content === payload.content && m.senderRole === payload.senderRole)
          );
          return [...filtered, { ...payload, status: 'SENT' }];
        });
        setIsPartnerTyping(false);
      }
    });

    // Lắng nghe sự kiện đối tác đang gõ phím (Realtime Typing Indicator)
    const unsubTyping = b2bWebSocket.subscribe(`/topic/chat/${rfq.rfqCode}/typing`, (payload: any) => {
      if (payload && payload.senderName !== currentUser.name) {
        if (payload.isTyping) {
          setIsPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3500);
        } else {
          setIsPartnerTyping(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubConn();
      unsubMsg();
      unsubTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
    };
  }, [isOpen, rfq, currentUser.name]);

  // Tự động cuộn xuống dưới cùng khi có tin nhắn mới hoặc đối tác đang soạn tin
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPartnerTyping, isOpen]);

  // Xử lý khi người dùng gõ bàn phím (Phát tín hiệu Typing realtime)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!rfq) return;

    // Gửi tín hiệu đang gõ
    sendB2bTypingSignal(rfq.rfqCode, true, currentUser.name, rfq.id);

    // Debounce: Sau 2 giây không gõ thì dừng
    if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
    myTypingTimerRef.current = setTimeout(() => {
      sendB2bTypingSignal(rfq.rfqCode, false, currentUser.name, rfq.id);
    }, 2000);
  };

  // Xử lý chọn ảnh
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewImageUrl(url);
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Gửi tin nhắn tức thì (Optimistic UI Update + WebSocket STOMP + Cloudinary Image URL)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rfq) return;

    const trimmed = inputText.trim();
    if (!trimmed && !selectedImage) return;

    // Dừng phát tín hiệu gõ
    if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
    sendB2bTypingSignal(rfq.rfqCode, false, currentUser.name, rfq.id);

    const tempId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    // 1. OPTIMISTIC UI: Hiển thị ngay lập tức lên khung chat trong 0.001 giây, không giật lag
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      rfqId: rfq.id || 0,
      rfqCode: rfq.rfqCode,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: trimmed,
      messageType: selectedImage ? 'IMAGE' : 'TEXT',
      imageUrl: previewImageUrl || undefined,
      createdAt: nowIso,
      status: 'SENDING',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    const imageToUpload = selectedImage;
    handleCancelImage();

    // 2. Tải ảnh lên Cloudinary lấy đường link vĩnh viễn (nếu có ảnh)
    let finalImageUrl: string | undefined = undefined;
    let messageType: 'TEXT' | 'IMAGE' = 'TEXT';

    if (imageToUpload) {
      setIsUploading(true);
      try {
        finalImageUrl = await uploadB2bChatImage(imageToUpload);
        messageType = 'IMAGE';
      } catch (err) {
        alert('Tải ảnh thất bại, vui lòng thử lại.');
        setIsUploading(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'FAILED' } : m))
        );
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const newMsgPayload: Omit<B2bChatMessage, 'id' | 'createdAt'> = {
      rfqId: rfq.id || 0,
      rfqCode: rfq.rfqCode,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: trimmed,
      messageType,
      imageUrl: finalImageUrl,
    };

    // 3. Gửi tin nhắn qua WebSocket STOMP tới Backend (Lưu Redis tạm & Broadcast tới đối tác)
    try {
      const sent = await sendB2bChatMessage(newMsgPayload);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...sent, imageUrl: finalImageUrl || m.imageUrl, status: 'SENT' }
            : m
        )
      );
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'FAILED' } : m))
      );
    }
  };

  if (!isOpen || !rfq) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[88vh] max-h-[760px] flex flex-col overflow-hidden shadow-2xl border border-emerald-100">
        {/* ================= HEADER PHÒNG CHAT CHUẨN REALTIME ================= */}
        <div className="bg-[#10542C] text-white p-4 shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0 border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black bg-white/20 text-emerald-100 px-2.5 py-0.5 rounded-lg border border-white/10">
                  {rfq.rfqCode}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Trực Tuyến Realtime (Socket)</span>
                </span>
              </div>
              <h3 className="font-heading font-black text-sm sm:text-base text-white mt-0.5 truncate max-w-[280px] sm:max-w-md">
                Đàm Phán: {partnerInfo.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer transition text-base"
              title="Đóng phòng chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================= TÓM TẮT ĐƠN ĐÀM PHÁN ================= */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between text-xs text-gray-700 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Sprout className="w-4 h-4 text-emerald-800 shrink-0" />
            <span className="truncate">
              Lô: <strong className="text-gray-900">{rfq.productName || 'Nông sản VietGAP'}</strong>{' '}
              {rfq.harvestLotCode && `(${rfq.harvestLotCode})`}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
            {rfq.requestedQuantity && (
              <span>
                SL: <strong className="text-emerald-900">{rfq.requestedQuantity.toLocaleString()} kg</strong>
              </span>
            )}
            {rfq.targetPrice && (
              <span>
                Giá: <strong className="text-[#10542C]">{rfq.targetPrice.toLocaleString()} đ/kg</strong>
              </span>
            )}
          </div>
        </div>

        {/* ================= DANH SÁCH TIN NHẮN (REALTIME FEED) ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#FAFBF9]">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <span>Đang đồng bộ dữ liệu cuộc trò chuyện từ Database...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100/60 text-emerald-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-700" />
              </div>
              <p className="font-semibold text-gray-700">Chưa có tin nhắn nào trong phiên này</p>
              <p className="text-[11px] text-gray-500 max-w-xs">
                Hai bên có thể trao đổi trực tiếp về quy cách đóng gói, chất lượng nông sản và tiến độ giao nhận trạm lạnh.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = String(msg.senderId) === String(currentUser.id) || msg.senderRole === currentUser.role;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in duration-100`}
                >
                  {/* Tên và vai trò */}
                  <span className="text-[10px] text-gray-400 px-1 font-semibold flex items-center gap-1">
                    {isMe ? 'Bạn' : msg.senderName || partnerInfo.name}
                    {!isMe && (
                      <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-bold">
                        {msg.senderRole === 'BUYER' ? 'Thương Lái' : msg.senderRole === 'FARMER' ? 'Nhà Vườn' : 'Hệ Thống'}
                      </span>
                    )}
                  </span>

                  {/* Bong bóng tin nhắn */}
                  <div
                    className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-2xs leading-relaxed transition-all ${
                      isMe
                        ? 'bg-[#10542C] text-white rounded-tr-xs'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-tl-xs'
                    }`}
                  >
                    {/* Hình ảnh đính kèm (Lưu dạng link URL trong Database) */}
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl relative group">
                        <img
                          src={msg.imageUrl}
                          alt="Ảnh đính kèm cuộc đàm phán"
                          loading="lazy"
                          className="max-h-60 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition bg-black/5"
                          onClick={() => setZoomImage(msg.imageUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setZoomImage(msg.imageUrl || null)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Xem ảnh phóng to"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Nội dung tin nhắn văn bản */}
                    {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                    {/* Timestamp & Trạng thái gửi tin */}
                    <div
                      className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${
                        isMe ? 'text-emerald-200/90' : 'text-gray-400'
                      }`}
                    >
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      {isMe && (
                        <span>
                          {msg.status === 'SENDING' ? (
                            <Clock className="w-3 h-3 text-emerald-300 animate-spin" />
                          ) : msg.status === 'FAILED' ? (
                            <span className="text-rose-300 font-bold">Lỗi</span>
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* HIỆU ỨNG ĐỐI TÁC ĐANG SOẠN TIN (REALTIME TYPING INDICATOR) */}
          {isPartnerTyping && (
            <div className="flex items-center gap-2 text-xs text-gray-500 animate-in fade-in duration-150 pl-1">
              <div className="bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#10542C]">{partnerInfo.name} đang soạn tin</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ================= PREVIEW ẢNH TRƯỚC KHI GỬI ================= */}
        {previewImageUrl && (
          <div className="bg-emerald-50/80 p-2.5 px-4 border-t border-emerald-100 flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-3">
              <img
                src={previewImageUrl}
                alt="Xem trước ảnh"
                className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs"
              />
              <div className="text-xs">
                <span className="font-bold text-gray-900 block truncate max-w-xs">
                  {selectedImage?.name || 'Ảnh đính kèm'}
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  Sẽ được tải lên và lưu đường link vĩnh viễn
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelImage}
              className="p-1.5 rounded-full hover:bg-emerald-100 text-gray-600 cursor-pointer transition"
              title="Hủy ảnh này"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= FORM NHẬP VÀ GỬI TIN NHẮN TỨC THÌ ================= */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
        >
          {/* File picker ẩn */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          {/* Nút chọn ảnh */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Đính kèm hình ảnh nông sản (Lưu link ảnh vào Database)"
          >
            <ImageIcon className="w-5 h-5 text-gray-600" />
          </button>

          {/* Ô nhập tin nhắn */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Nhập tin nhắn đàm phán realtime (Enter để gửi)..."
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#10542C] focus:bg-white transition"
          />

          {/* Nút gửi */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isUploading}
            className="w-10 h-10 rounded-2xl bg-[#10542C] hover:bg-[#0c3e20] active:scale-95 text-white flex items-center justify-center transition shadow-xs cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Gửi tin nhắn"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* ================= MODAL LIGHTBOX XEM ẢNH PHÓNG TO ================= */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Phóng to ảnh đàm phán"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center shadow-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
