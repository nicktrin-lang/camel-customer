"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Locale = "en" | "es";

const STRINGS: Record<Locale, {
  suggestions: string[];
  welcome: string;
  endChat: string;
  sendingTranscript: string;
  endedTranscript: string;
  endedNoTranscript: string;
  startNew: string;
  subtitle: string;
  placeholder: string;
  errorFailed: string;
  errorGeneric: string;
}> = {
  en: {
    suggestions: [
      "Where is my driver?",
      "What is my booking status?",
      "How does the fuel deposit work?",
      "How do I cancel a booking?",
    ],
    welcome: "👋 Hi! I'm Camel Help. I can answer questions about your bookings, driver details, fuel deposits, and more. How can I help?",
    endChat: "End chat",
    sendingTranscript: "Sending transcript…",
    endedTranscript: "✅ Chat ended. A transcript has been emailed to you.",
    endedNoTranscript: "Chat ended.",
    startNew: "Start new chat",
    subtitle: "AI assistant · usually instant",
    placeholder: "Type a message…",
    errorFailed: "Failed to get a response.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  es: {
    suggestions: [
      "¿Dónde está mi conductor?",
      "¿Cuál es el estado de mi reserva?",
      "¿Cómo funciona el depósito de combustible?",
      "¿Cómo cancelo una reserva?",
    ],
    welcome: "👋 ¡Hola! Soy Camel Help. Puedo responder preguntas sobre tus reservas, detalles del conductor, depósitos de combustible y más. ¿En qué puedo ayudarte?",
    endChat: "Finalizar chat",
    sendingTranscript: "Enviando transcripción…",
    endedTranscript: "✅ Chat finalizado. Se te ha enviado una transcripción por correo.",
    endedNoTranscript: "Chat finalizado.",
    startNew: "Nuevo chat",
    subtitle: "Asistente IA · normalmente instantáneo",
    placeholder: "Escribe un mensaje…",
    errorFailed: "No se pudo obtener una respuesta.",
    errorGeneric: "Algo salió mal. Por favor, inténtalo de nuevo.",
  },
};

function renderText(text: string) {
  const phoneRe = /(\+?[\d ()[\]-]{9,15})/g;
  const parts = text.split(phoneRe);
  return parts.map((part, i) => {
    const digits = part.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15 && /\d/.test(part) && part.trim().length > 0) {
      return (
        <a key={i} href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 text-xs font-black hover:bg-green-600 transition-colors mx-0.5">
          💬 {part.trim()}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatWidget({
  getToken,
  apiPath = "/api/chat",
  transcriptApiPath = "/api/chat/transcript",
  locale = "en",
}: {
  getToken: () => Promise<string | null>;
  apiPath?: string;
  transcriptApiPath?: string;
  locale?: Locale;
}) {
  const s = STRINGS[locale] ?? STRINGS.en;

  const [open, setOpen]             = useState(false);
  const [msgs, setMsgs]             = useState<Msg[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [unread, setUnread]         = useState(0);
  const [ended, setEnded]           = useState(false);
  const [emailSent, setEmailSent]   = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Position stored as distance from bottom-right corner
  const [pos, setPos]   = useState<{ x: number; y: number } | null>(null);
  const dragging        = useRef(false);
  const didDrag         = useRef(false);
  const dragOffset      = useRef({ x: 0, y: 0 });
  const bubbleRef       = useRef<HTMLButtonElement>(null);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── shared drag logic ────────────────────────────────────────────────────
  function startDrag(clientX: number, clientY: number) {
    dragging.current = true;
    didDrag.current  = false;
    const rect = bubbleRef.current!.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragging.current) return;
    didDrag.current = true;
    const x = window.innerWidth  - (clientX - dragOffset.current.x) - 56;
    const y = window.innerHeight - (clientY - dragOffset.current.y) - 56;
    setPos({ x: Math.max(8, x), y: Math.max(8, y) });
  }

  function endDrag() { dragging.current = false; }

  // ── mouse events ─────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) { moveDrag(e.clientX, e.clientY); }
    function onUp() { endDrag(); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── touch events ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    // Don't preventDefault here — allows the click to still fire on tap
  }, []);

  useEffect(() => {
    function onMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
      e.preventDefault(); // prevent page scroll while dragging
    }
    function onUp() { endDrag(); }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const right  = pos ? `${pos.x}px` : "24px";
  const bottom = pos ? `${pos.y}px` : "24px";

  // ── messaging ─────────────────────────────────────────────────────────────
  async function send(text: string) {
    const content = text.trim();
    if (!content || loading || ended) return;
    setInput("");
    setError(null);

    const newMsgs: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiPath, {
        method: "POST", headers,
        body: JSON.stringify({ messages: newMsgs }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || s.errorFailed);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMsgs(m => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMsgs(m => {
          const updated = [...m];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }

      if (!open) setUnread(u => u + 1);
    } catch (e: any) {
      setError(e?.message || s.errorGeneric);
      setMsgs(m => m.length > 0 && m[m.length - 1].role === "assistant" && m[m.length - 1].content === "" ? m.slice(0, -1) : m);
    } finally {
      setLoading(false);
    }
  }

  async function endChat() {
    if (msgs.length === 0) { setOpen(false); return; }
    setEnded(true);
    setSendingEmail(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(transcriptApiPath, {
        method: "POST", headers,
        body: JSON.stringify({ messages: msgs }),
      });
      setEmailSent(true);
    } catch { /* best effort */ }
    finally { setSendingEmail(false); }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  function startNew() {
    setMsgs([]); setEnded(false); setEmailSent(false); setError(null);
  }

  function handleBubbleClick() {
    if (didDrag.current) { didDrag.current = false; return; }
    setOpen(o => !o);
  }

  const isEmpty = msgs.length === 0;

  return (
    <>
      {/* Floating bubble */}
      <button
        ref={bubbleRef}
        type="button"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleBubbleClick}
        style={{ right, bottom }}
        className="fixed z-[9999] flex h-14 w-14 items-center justify-center bg-[#ff7a00] text-white shadow-lg hover:opacity-90 transition-opacity cursor-grab active:cursor-grabbing select-none touch-none"
        aria-label="Open help chat"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full">{unread}</span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{ right, bottom: `calc(${bottom} + 64px)`, height: "520px" }}
          className="fixed z-[9998] flex flex-col w-[360px] max-w-[calc(100vw-24px)] bg-white shadow-2xl border border-black/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-black px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[#ff7a00]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none">Camel Help</p>
                <p className="text-xs text-white/50 mt-0.5">{s.subtitle}</p>
              </div>
            </div>
            {!ended && msgs.length > 0 && (
              <button type="button" onClick={endChat}
                className="text-xs font-bold text-white/50 hover:text-white border border-white/20 px-2 py-1 transition-colors">
                {s.endChat}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {isEmpty && !ended && (
              <div className="space-y-3">
                <div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black max-w-[85%]">
                  {s.welcome}
                </div>
                <div className="space-y-2 pt-1">
                  {s.suggestions.map(suggestion => (
                    <button key={suggestion} type="button" onClick={() => send(suggestion)}
                      className="block w-full text-left border border-black/10 px-3 py-2 text-xs font-bold text-black hover:bg-[#f0f0f0] transition-colors">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#ff7a00] text-white font-semibold"
                    : "bg-[#f0f0f0] text-black font-medium"
                }`}>
                  {m.role === "assistant" ? (
                    m.content === "" && loading && i === msgs.length - 1
                      ? <span className="inline-block w-2 h-4 bg-black/40 animate-pulse" />
                      : renderText(m.content)
                  ) : m.content}
                </div>
              </div>
            ))}

            {ended && (
              <div className="space-y-3 pt-2">
                <div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black">
                  {sendingEmail ? s.sendingTranscript : emailSent ? s.endedTranscript : s.endedNoTranscript}
                </div>
                <button type="button" onClick={startNew}
                  className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 transition-opacity">
                  {s.startNew}
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!ended && (
            <div className="border-t border-black/10 p-3 shrink-0 flex gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={loading}
                placeholder={s.placeholder}
                className="flex-1 resize-none bg-[#f0f0f0] px-3 py-2.5 text-sm font-medium text-black outline-none placeholder:text-black/30 disabled:opacity-50"
                style={{ maxHeight: "80px" }}
              />
              <button type="button" onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="shrink-0 bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                {loading
                  ? <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : "→"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
