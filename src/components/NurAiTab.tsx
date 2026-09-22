import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  User,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { askNurAi } from '../services/apiService';
import { ChatMessage } from '../types';

interface NurAiTabProps {
  userName: string;
}

export const NurAiTab: React.FC<NurAiTabProps> = ({ userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('nur_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_e) {}
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Əs-Səlamu aleykum və rəhmətullahi və bərəkətuh${
          userName ? `, ${userName}` : ''
        }!

Mən **Nur AI** – İslam dininə dair suallarınızı Quran-i Kərim və Səhih Hədislər işığında cavablandıran mənəvi köməkçinizəm.

Aşağıdakı mövzularda və ya sizi maraqlandıran istənilən İslami məsələdə sual verə bilərsiniz:
- Dəstəmaz və namazın qaydaları
- Ramazan, oruc və Qədr gecəsi
- Tövbə, bağışlanma və zikr
- Quran ayələrinin mənası və izahı

*Qeyd: Mən bələdçi rolunu daşıyıram, rəsmi şəriət fətvası üçün səlahiyyətli din xadimlərinə müraciət etməyiniz tövsiyə olunur.*`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts in Azerbaijani
  const quickQuestions = [
    'Dəstəmazın fərzləri nələrdir?',
    'Qədr gecəsinin əsas fəzilətləri və duası',
    'Tövbənin qəbul olunması üçün şərtlər',
    'Səfərdə (yolçuluqda) namaz necə qılınır?',
    'Gündəlik hansı zikrləri etmək daha fəzilətlidir?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    try {
      localStorage.setItem('nur_ai_chat_history', JSON.stringify(messages));
    } catch (_e) {}
  }, [messages, loading]);

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputQuestion).trim();
    if (!q || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setLoading(true);

    try {
      // Build conversation history for context (last 6 messages)
      const historyContext = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.content,
      }));

      const reply = await askNurAi(q, historyContext);

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (_err) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          'Bağışlayın, cavab hazırlanarkən xəta baş verdi. Zəhmət olmasa internet bağlantınızı yoxlayıb yenidən cəhd edin.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChatConfirm = () => {
    const resetMessages: ChatMessage[] = [
      {
        id: `msg-reset-${Date.now()}`,
        role: 'assistant',
        content: 'Əs-Səlamu aleykum! Söhbət təmizləndi. Yeni sualınızı verə bilərsiniz.',
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(resetMessages);
    setShowConfirmClear(false);
    try {
      localStorage.setItem('nur_ai_chat_history', JSON.stringify(resetMessages));
    } catch (_e) {}
  };

  return (
    <div id="nur-ai-view" className="flex flex-col h-[calc(100vh-165px)] max-h-[750px]">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-emerald-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 flex items-center justify-center text-amber-300 shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>Nur AI</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full border border-amber-400/30">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-[11px] text-stone-600 dark:text-stone-300">
              Quran və Səhih Hədislərə əsaslanan dini bələdçi
            </p>
          </div>
        </div>

        {/* Clear Chat Button / Confirmation */}
        {showConfirmClear ? (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 p-1 rounded-xl border border-amber-400/30 animate-in fade-in">
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold px-1">Silinsin?</span>
            <button
              onClick={handleClearChatConfirm}
              className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              title="Bəli, sil"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowConfirmClear(false)}
              className="p-1 rounded-lg bg-stone-200 dark:bg-emerald-900 text-stone-700 dark:text-stone-300 hover:bg-stone-300 transition"
              title="İmtina et"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-emerald-900/40 transition"
            title="Söhbəti təmizlə"
            aria-label="Söhbəti təmizlə"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          // Separate sources section if present
          let mainContent = msg.content;
          let sourcesContent: string | null = null;
          if (!isUser && msg.content.includes('📌 Mənbələr və İstinadlar:')) {
            const parts = msg.content.split('📌 Mənbələr və İstinadlar:');
            mainContent = parts[0].trim();
            sourcesContent = parts[1]?.trim() || null;
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-amber-500 text-white'
                    : 'bg-[#064e3b] text-amber-300 border border-amber-400/30'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#064e3b] text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#0c1e15] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-emerald-800/40 shadow-xs rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line break-words font-normal">
                  {mainContent}
                </div>

                {sourcesContent && (
                  <div className="mt-3 pt-2.5 border-t border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl text-[11px] text-stone-700 dark:text-stone-300">
                    <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Mənbələr və İstinadlar:</span>
                    </div>
                    <div className="whitespace-pre-line text-stone-600 dark:text-stone-300">
                      {sourcesContent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300 text-xs py-2 pl-10">
            <div className="w-2 h-2 rounded-full bg-[#064e3b] dark:bg-amber-400 animate-ping" />
            <span>Nur AI cavab hazırlayır...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      {messages.length < 3 && !loading && (
        <div className="py-2 overflow-x-auto flex gap-1.5 scrollbar-thin">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-stone-800 dark:text-stone-200 text-xs font-medium border border-stone-200 dark:border-emerald-800/40 transition shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Disclaimer Box */}
      <div className="py-1 px-2 text-[10px] text-stone-600 dark:text-stone-300 flex items-center justify-center gap-1 text-center">
        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
        <span>Bələdçi xarakterlidir; rəsmi fətvalar üçün səlahiyyətli din alimlərinə müraciət edin.</span>
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="İslam haqqında sualınızı yazın..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#0c1e15] border border-stone-200/80 dark:border-emerald-800/40 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] dark:focus:ring-amber-400 shadow-xs"
        />

        <button
          type="submit"
          disabled={!inputQuestion.trim() || loading}
          className="p-3 rounded-2xl bg-gradient-to-tr from-[#064e3b] to-emerald-600 text-amber-300 disabled:opacity-40 shadow-md hover:brightness-110 transition shrink-0"
          aria-label="Göndər"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

