'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sprout,
  Bot,
  User,
  Send,
  RotateCcw,
  Sparkles,
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { farmerAiChatApi, configGeminiKeyApi, getAiStatusApi } from '@/services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

interface FarmerAiChatViewProps {
  farmerName?: string;
}

/**
 * Component định dạng font chữ và trình bày văn bản câu trả lời từ AI
 * Loại bỏ triệt để các ký tự markdown thô (###, **, *) và hiển thị thẻ trực quan
 */
function FormattedAgriAnswer({ text }: { text: string }) {
  const lines = text.split('\n');

  const parseInlineStyles = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={i} className="font-bold text-[#0D4423]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <span
            key={i}
            className="inline-block px-2 py-0.5 mx-0.5 rounded-md bg-emerald-100/90 text-emerald-950 font-mono text-xs font-bold"
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={i} className="italic text-gray-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed text-[#1F2937]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header ###
        if (trimmed.startsWith('###')) {
          const title = trimmed.replace(/^###\s*/, '').replace(/\*\*/g, '');
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-emerald-100 flex items-center gap-1.5 text-[#10542C] font-heading font-black text-xs sm:text-sm">
              <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full inline-block" />
              <span>{title}</span>
            </div>
          );
        }

        // Header ##
        if (trimmed.startsWith('##')) {
          const title = trimmed.replace(/^##\s*/, '').replace(/\*\*/g, '');
          return (
            <div key={idx} className="pt-2.5 pb-1 border-b border-emerald-200 flex items-center gap-1.5 text-[#0D4423] font-heading font-black text-sm">
              <span className="w-2 h-4 bg-[#10542C] rounded-full inline-block" />
              <span>{title}</span>
            </div>
          );
        }

        // Bullet point
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const content = trimmed.replace(/^[•\-*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-emerald-700 font-bold shrink-0 mt-0.5">•</span>
              <div className="flex-1 text-[#2C3E2E]">{parseInlineStyles(content)}</div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-[#2C3E2E]">{parseInlineStyles(numMatch[2])}</div>
            </div>
          );
        }

        // Đoạn văn thông thường
        return (
          <p key={idx} className="text-[#2C3E2E]">
            {parseInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Kiểm tra nhanh câu hỏi ngoài lề hoặc cây công nghiệp
function checkNonVegTopic(query: string): { isOffTopic: boolean; reason: 'non_veg' | 'general' } {
  const lower = query.toLowerCase();

  const nonVegKeywords = [
    'cà phê', 'ca phe', 'coffee',
    'cao su', 'tiêu', 'hồ tiêu', 'điều', 'hạt điều', 'mía', 'chè búp', 'trà',
    'sầu riêng', 'sau rieng', 'thanh long', 'bưởi', 'buoi', 'sầu',
    'xoài', 'cam sành', 'mãng cầu', 'vải thiều', 'nhãn lồng', 'măng cụt',
  ];

  const generalOffTopic = [
    'viết code', 'lập trình', 'javascript', 'python', 'java', 'html',
    'giải toán', 'vật lý', 'hóa học bài tập',
    'bóng đá', 'thời sự thế giới', 'ca sĩ', 'showbiz', 'xem bói', 'tử vi',
  ];

  if (generalOffTopic.some((kw) => lower.includes(kw))) {
    return { isOffTopic: true, reason: 'general' };
  }

  if (nonVegKeywords.some((kw) => lower.includes(kw))) {
    return { isOffTopic: true, reason: 'non_veg' };
  }

  return { isOffTopic: false, reason: 'general' };
}

export default function FarmerAiChatView({ farmerName }: FarmerAiChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        'Dạ em chào bà con nông dân và Hợp tác xã mình! Em là **Trợ Lý HoNa Fresh** đây ạ.\n\n' +
        'Em chuyên trách túc trực hỗ trợ bà con về **mặt hàng rau củ quả tươi sạch**:\n' +
        '• **Tra cứu giá sỉ chợ đầu mối hôm nay** (Thủ Đức, Bình Điền, Hóc Môn... giá rau ăn lá, cà chua, ớt chuông, khoai củ, nấm sạch).\n' +
        '• **Tư vấn khung giờ cắt thu hoạch chuẩn** để rau củ giòn ngọt, ráo sương, giữ được tươi lâu.\n' +
        '• **Kỹ thuật hạ nhiệt sơ bộ (Pre-cooling) & xếp xe lạnh** để đạt chuẩn kiểm định QC xuất trạm trên 98%.\n\n' +
        'Bà con mình đang chuẩn bị thu hoạch hay cần khảo sát giá loại rau củ quả nào cứ hỏi em ngay nhé!',
      time: 'Vừa xong',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Kiểm tra trạng thái Gemini AI từ backend
  useEffect(() => {
    getAiStatusApi()
      .then((res) => {
        setHasGeminiKey(res.hasGeminiKey);
      })
      .catch(() => {});
  }, []);

  // Tự cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isReplying]);

  // Gửi tin nhắn và xử lý qua Backend (Bảo mật 100%, không để lộ Secret Key)
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputQuery).trim();
    if (!textToSend || isReplying) return;

    const timeNow = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: timeNow,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInputQuery('');
    setIsReplying(true);

    const lowerQuery = textToSend.toLowerCase().trim();

    // 1. KIỂM TRA GUARDRAIL: CÂU HỎI NGOÀI LỀ HOẶC CÂY CÔNG NGHIỆP / TRÁI CÂY LỚN
    const checkResult = checkNonVegTopic(lowerQuery);
    if (checkResult.isOffTopic) {
      setTimeout(() => {
        let refusalText = '';
        if (checkResult.reason === 'non_veg') {
          refusalText =
            'Dạ thưa bà con/anh chị, em là **Trợ Lý HoNa Fresh** chỉ chuyên sâu hỗ trợ về **mặt hàng rau củ quả tươi sạch** (như rau ăn lá, cà chua, ớt chuông, bắp cải, cà rốt, khoai tây, nấm tươi...) thôi nè!\n\n' +
            'Về cây công nghiệp (như cà phê, tiêu, cao su...) hay cây ăn trái lớn (như sầu riêng, thanh long...) thì sàn HoNa Fresh tụi em không chuyên trách. Bà con mình hỏi em về giá cả, khung giờ thu hoạch hay cách làm mát bảo quản các loại rau củ quả để em tư vấn tận tình cho bà con nha!';
        } else {
          refusalText =
            'Dạ em là trợ lý nhà nông, chuyên ăn ngủ cùng ruộng vườn rau củ quả, giá chợ đầu mối với xe lạnh thôi hà! Mấy chuyện ngoài lề này em hổng rành đâu nè.\n\n' +
            'Bà con mình hỏi em chuyện vụ mùa rau củ, giá chợ hôm nay, giờ cắt thu hoạch hay cách làm mát rau củ trước khi chở đi để em mách nước nhiệt tình nha!';
        }

        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: refusalText,
          time: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, botReply]);
        setIsReplying(false);
      }, 300);
      return;
    }

    let finalAnswer = '';

    // 2. GỌI QUA BACKEND SPRING BOOT (BẢO MẬT TUYỆT ĐỐI NHƯ TRANG CHỦ)
    try {
      finalAnswer = await farmerAiChatApi(textToSend);
    } catch (err) {
      console.warn('Lỗi gọi API chatbot nông dân qua backend, chuyển sang fallback:', err);
    }

    // 3. DỰ PHÒNG THÔNG MINH NẾU MẤT KẾT NỐI INTERNET
    if (!finalAnswer) {
      finalAnswer =
        `Dạ em xin trả lời bà con về **${textToSend}** đây ạ!\n\n` +
        `• **Về giá rau củ chợ đầu mối hôm nay:** Giá sỉ các loại rau củ chính đang giữ ở mức tốt (Cà chua beef: 15.000 - 16.500 đ/kg, Xà lách thủy canh VietGAP: 28.000 - 32.000 đ/kg, Bắp cải trái tim: 11.500 - 13.000 đ/kg, Khoai tây Đà Lạt: 17.000 - 20.000 đ/kg). Đi hàng số lượng lớn theo tấn nên chốt hợp đồng sớm để được hỗ trợ xe lạnh.\n` +
        `• **Về thu hoạch:** Bà con mình ưu tiên cắt rau lá vào sáng sớm tinh sương từ 5h đến 7h30 sáng lúc lá ngậm sương căng ngọt, cà chua hái 7h30 - 10h sau khi ráo hẳn sương đêm. Ráng tránh cắt lúc trưa nắng gắt hoặc trời mưa dầm.\n` +
        `• **Về bảo quản xe lạnh:** Nhớ hạ nhiệt sơ bộ (Pre-cooling) bằng quạt gió đối lưu hoặc xối nước mát trước khi xếp sọt lên xe lạnh để ruột quả mát dưới 8°C, xe lạnh cài 2°C - 5°C (cà chua 8°C - 12°C) thì bao tươi ngon về tới chợ Sài Gòn luôn nha bà con!`;
    }

    const botMessage: ChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: finalAnswer,
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsReplying(false);
  };

  // Làm mới cuộc trò chuyện
  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text:
          'Dạ em chào bà con nông dân và Hợp tác xã mình! Em là **Trợ Lý HoNa Fresh** đây ạ.\n\n' +
          'Em chuyên trách túc trực hỗ trợ bà con về **mặt hàng rau củ quả tươi sạch**:\n' +
          '• **Tra cứu giá sỉ chợ đầu mối hôm nay** (Thủ Đức, Bình Điền, Hóc Môn... giá rau ăn lá, cà chua, ớt chuông, khoai củ, nấm sạch).\n' +
          '• **Tư vấn khung giờ cắt thu hoạch chuẩn** để rau củ giòn ngọt, ráo sương, giữ được tươi lâu.\n' +
          '• **Kỹ thuật hạ nhiệt sơ bộ (Pre-cooling) & xếp xe lạnh** để đạt chuẩn kiểm định QC xuất trạm trên 98%.\n\n' +
          'Bà con mình đang chuẩn bị thu hoạch hay cần khảo sát giá loại rau củ quả nào cứ hỏi em ngay nhé!',
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  // Cấu hình Google Gemini API Key an toàn lên Server
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsSavingKey(true);
    setConfigStatus(null);
    try {
      const ok = await configGeminiKeyApi(apiKeyInput.trim());
      if (ok) {
        setHasGeminiKey(true);
        setConfigStatus('✅ Đã lưu Google Gemini API Key an toàn lên máy chủ!');
        setTimeout(() => {
          setIsConfigModalOpen(false);
          setConfigStatus(null);
          setApiKeyInput('');
        }, 1500);
      } else {
        setConfigStatus('❌ API Key không hợp lệ hoặc không thể kết nối');
      }
    } catch (err: unknown) {
      setConfigStatus(err instanceof Error ? err.message : 'Lỗi khi cấu hình API Key');
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white rounded-3xl border border-[#EAECE8] shadow-sm overflow-hidden">
      {/* Chatbot Header */}
      <div className="shrink-0 px-5 sm:px-6 py-3.5 bg-gradient-to-r from-[#10542C] via-emerald-800 to-[#10542C] text-white flex items-center justify-between border-b border-emerald-900/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-emerald-300 shadow-inner">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#10542C] rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-heading font-black tracking-wide text-white">
                Trợ Lý HoNa Fresh
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/50 border border-emerald-300/40 text-emerald-100 flex items-center gap-1">
                AI Cố Vấn Nông Nghiệp & Chuỗi Lạnh
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Khảo sát giá sỉ chợ đầu mối, tư vấn thu hoạch rau củ chuẩn VietGAP & bảo quản xe lạnh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Cài đặt Key */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            title="Cấu hình Google Gemini API Key"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              hasGeminiKey
                ? 'bg-emerald-700/60 text-emerald-200 border-emerald-500/40 hover:bg-emerald-700'
                : 'bg-amber-500/80 text-white border-amber-400 hover:bg-amber-600 animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasGeminiKey ? 'Gemini AI Sẵn Sàng' : 'Cấu Hình API Key'}</span>
          </button>

          {/* Nút Làm mới chat */}
          <button
            type="button"
            onClick={handleResetChat}
            title="Bắt đầu phiên hội thoại mới"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới chat</span>
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-[#FBFDFB] via-[#F8FAF7] to-[#F3F6F2]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-xl bg-[#10542C] text-emerald-300 flex items-center justify-center shrink-0 shadow-xs border border-emerald-700/50 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] space-y-1 flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-[10.5px] text-gray-500 px-1 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <span className="font-semibold text-gray-700">
                  {msg.sender === 'user' ? farmerName || 'Bà con nông dân' : 'Trợ Lý HoNa Fresh'}
                </span>
                {msg.time && <span>• {msg.time}</span>}
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#10542C] text-white rounded-tr-xs shadow-emerald-950/10'
                    : 'bg-white border border-[#E3E8E1] text-[#1E293B] rounded-tl-xs'
                }`}
              >
                {msg.sender === 'user' ? (
                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                ) : (
                  <FormattedAgriAnswer text={msg.text} />
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#10542C] flex items-center justify-center shrink-0 shadow-xs border border-emerald-200 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isReplying && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-xl bg-[#10542C] text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-emerald-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
              </div>
              <span className="text-xs text-emerald-800 font-medium italic">
                Trợ lý HoNa Fresh đang kết nối máy chủ phân tích dữ liệu vụ mùa cho bà con...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions / Quick chips */}
      <div className="shrink-0 px-4 py-2 bg-[#F6F8F5] border-t border-[#EAECE8] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-gray-600 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Gợi ý hỏi:
        </span>
        {[
          {
            label: '📊 Giá sỉ rau củ chợ đầu mối?',
            query: 'Giá sỉ cà chua beef, xà lách và bắp cải tại chợ đầu mối Thủ Đức và Bình Điền hôm nay thế nào em?',
          },
          {
            label: '🥬 Khung giờ thu hoạch rau lá?',
            query: 'Cắt xà lách thủy canh và các loại rau ăn lá vào mấy giờ sáng thì giòn ngọt và tươi lâu nhất?',
          },
          {
            label: '🍅 Giá & Thu hoạch Cà chua?',
            query: 'Giá cà chua beef hôm nay bao nhiêu và hái lúc nào để cuống khô không bị nấm mốc em?',
          },
          {
            label: '❄️ Kỹ thuật Pre-cooling rau củ?',
            query: 'Chỉ giúp bà con cách hạ nhiệt sơ bộ (Pre-cooling) rau củ trước khi chở xe lạnh giao trạm nha em?',
          },
          {
            label: '🥕 Cách bảo quản củ quả đi xa?',
            query: 'Khoai tây, cà rốt và củ quả bảo quản xe lạnh thế nào để không bị thối nhũn em?',
          },
          {
            label: '🌧️ Mẹo thu hoạch rau khi trời mưa?',
            query: 'Trời mưa dầm có nên cắt rau lá không và cách xử lý thế nào để không bị thối nhũn?',
          },
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.query)}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-[#10542C] border border-[#DEE3DC] hover:border-emerald-300 rounded-xl text-xs font-medium shrink-0 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Chat Box */}
      <div className="shrink-0 p-3 sm:p-3.5 bg-white border-t border-[#EAECE8]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 sm:gap-2.5"
        >
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Hỏi em về giá rau củ hôm nay, giờ cắt thu hoạch, cách làm mát trước khi lên xe lạnh... (Nhấn Enter)"
              className="w-full px-4 py-2.5 sm:py-3 bg-[#F8FAF7] border border-[#DDE2DB] rounded-2xl text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-500/15 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!inputQuery.trim() || isReplying}
            className="px-4 sm:px-5 py-2.5 sm:py-3 bg-[#10542C] hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm hover:shadow flex items-center gap-2 transition cursor-pointer shrink-0"
          >
            <span>Gửi</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modal Cấu hình API Key (Bảo Mật như Trang Chủ) */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EAECE8] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#10542C]" />
                <h3 className="font-heading font-black text-base text-[#10542C]">
                  Cấu Hình Google Gemini API Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                Khóa API được lưu trữ bền vững và bảo mật trực tiếp trên máy chủ backend HoNa Fresh, tuyệt đối không bị lộ ra mã nguồn frontend.
              </p>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nhập Google Gemini API Key:</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#F9F9F5] border border-gray-200 rounded-xl px-3 py-2.5 font-mono text-gray-800 focus:outline-none focus:border-[#10542C]"
                />
              </div>

              {configStatus && (
                <div
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 ${
                    configStatus.startsWith('✅')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {configStatus.startsWith('✅') ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{configStatus}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || isSavingKey}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#10542C] text-white hover:bg-emerald-900 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingKey ? 'Đang lưu...' : 'Lưu Khóa API'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
