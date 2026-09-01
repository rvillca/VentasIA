import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Send,
  X,
  PlusCircle,
  DollarSign,
  Calculator,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  Trash2,
  User,
  Phone,
  MapPin,
  FileText,
  Edit3,
  HelpCircle,
  Package,
  Layers,
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Order, OrderItem } from '../types';
import { formatCurrency, getNextOrderNumber, formatBoliviaPhone } from '../lib/storage';
import { cleanVoiceTranscript } from '../lib/cleanSpeech';
import { VikaGuideModal } from './VikaGuideModal';
import { useTheme } from '../contexts/ThemeContext';

export interface VikaSuggestedOrder {
  cliente?: string;
  telefono?: string;
  lugarEntrega?: string;
  observaciones?: string;
  productos: Array<{
    nombre: string;
    variante?: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  pagado?: number;
  total?: number;
  saldo?: number;
}

export interface VikaMessage {
  id: string;
  sender: 'user' | 'vika';
  text: string;
  timestamp: string;
  suggestedOrder?: VikaSuggestedOrder;
  registeredOrderId?: string;
  registeredOrderNumber?: number;
  quickCalculations?: {
    totalBs?: number;
    cambioBs?: number;
    ahorroBs?: number;
  };
  suggestedActions?: string[];
}

interface VikaAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  activeTab: string;
  onTransferToNewOrder: (draft: {
    productos: Array<{
      nombre: string;
      variante?: string;
      cantidad: number;
      precioUnitario: number;
    }>;
    pagado?: number;
    observaciones?: string;
    cliente?: string;
    telefono?: string;
    lugarEntrega?: string;
  }) => void;
  onSaveDirectOrder?: (order: Order) => void;
}

const QUICK_PROMPTS = [
  '📦 1 box de 48 gomas Kitty + 1 docena bolígrafos + 1 box de 24 tajadores Kuromi',
  '🎁 2 docenas libretas Kuromi + media docena estuches Stitch para Camila',
  '💡 ¿Cómo dictar pedidos por cajas y docenas?',
  '💰 ¿Cuánto dinero hay en caja y por cobrar hoy?',
];

export const VikaAssistantModal: React.FC<VikaAssistantModalProps> = ({
  isOpen,
  onClose,
  orders,
  activeTab,
  onTransferToNewOrder,
  onSaveDirectOrder,
}) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<VikaMessage[]>([
    {
      id: 'welcome-1',
      sender: 'vika',
      text: '¡Hola! Soy **VIKA**, tu asistente de ventas e inteligencia de **Importadora Chiquiminisos** 🇧🇴.\n\nPuedes dictarme tus artículos con cajas, docenas o unidades (ej: *«1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio + 1 box de 24 tajadores Kuromi para Camila»*). Armaré la lista limpia y lista para que asignes precios en el formulario.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        '1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio + 1 box de 24 tajadores Kuromi',
        '2 docenas libretas Kuromi + media docena estuches Stitch para Camila',
        '💡 Ver Guía de Dictado',
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook for voice speech recognition
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    resetTranscript,
  } = useSpeechRecognition();

  // Sync transcript from speech to input
  useEffect(() => {
    if (transcript) {
      const cleaned = cleanVoiceTranscript(transcript);
      setInputMessage(cleaned);
    }
  }, [transcript]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    if (!hasSupport) {
      alert('Tu navegador o dispositivo no soporta reconocimiento de voz nativo. Por favor escribe tu mensaje.');
      return;
    }
    if (isListening) {
      stopListening();
      if (inputMessage.trim()) {
        handleSendMessage(inputMessage);
      }
    } else {
      resetTranscript();
      setInputMessage('');
      startListening();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    if (!rawText.trim() || isLoading) return;

    if (isListening) {
      stopListening();
    }

    const userText = cleanVoiceTranscript(rawText.trim());
    setInputMessage('');
    resetTranscript();

    // 1. Append user message
    const userMsgId = `user-${Date.now()}`;
    const newMessages: VikaMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Call server-side API or fallback local parser for parsing orders
      const response = await fetch('/api/vika-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: newMessages.slice(-6),
          totalOrders: orders.length,
          openOrders: orders.filter((o) => o.estado === 'Abierto').length,
          deliveredOrders: orders.filter((o) => o.estado === 'Entregado').length,
          totalRevenue: orders.reduce((s, o) => s + (o.pagado || 0), 0),
          totalPending: orders.reduce((s, o) => s + (o.saldo || 0), 0),
        }),
      });

      let data: any;
      if (response.ok) {
        data = await response.json();
      } else {
        // Fallback local mock logic if offline or backend missing
        data = generateLocalVikaResponse(userText, orders);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `vika-${Date.now()}`,
          sender: 'vika',
          text: data.reply || '¡Entendido! He procesado tu solicitud.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedOrder: data.suggestedOrder,
          quickCalculations: data.quickCalculations,
          suggestedActions: data.suggestedActions,
        },
      ]);
    } catch (err) {
      console.warn('Vika API error, fallback to local NLP:', err);
      const localData = generateLocalVikaResponse(userText, orders);
      setMessages((prev) => [
        ...prev,
        {
          id: `vika-${Date.now()}`,
          sender: 'vika',
          text: localData.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedOrder: localData.suggestedOrder,
          quickCalculations: localData.quickCalculations,
          suggestedActions: localData.suggestedActions,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback parser
  const generateLocalVikaResponse = (text: string, currentOrders: Order[]) => {
    const lower = text.toLowerCase();

    // Check if asking for cash stats
    if (lower.includes('caja') || lower.includes('cobrar') || lower.includes('dinero') || lower.includes('cuanto')) {
      const cobrado = currentOrders.reduce((s, o) => s + (o.pagado || 0), 0);
      const saldo = currentOrders.reduce((s, o) => s + (o.saldo || 0), 0);
      const total = currentOrders.reduce((s, o) => s + (o.total || 0), 0);
      return {
        reply: `💰 **Resumen Financiero Actual:**\n• **Cobrado en Caja:** ${formatCurrency(cobrado)}\n• **Saldos por Cobrar:** ${formatCurrency(saldo)}\n• **Ventas Totales:** ${formatCurrency(total)}\n• **Pedidos Registrados:** ${currentOrders.length}`,
        quickCalculations: {
          totalBs: cobrado,
          ahorroBs: saldo,
        },
        suggestedActions: ['Ver Pedidos Abiertos', 'Ver Saldos Pendientes'],
      };
    }

    // Parse items by keywords like box, docena, etc.
    const items: Array<{ nombre: string; variante?: string; cantidad: number; precioUnitario: number }> = [];
    const segments = text.split(/(?:\+|y|más|,|\n)/i);

    segments.forEach((seg) => {
      const s = seg.trim();
      if (!s) return;

      let qty = 1;
      let presentation = '';
      let name = s;

      // Extract box
      const boxMatch = s.match(/(?:(\d+)\s*)?box(?:es)?(?:\s*de\s*(\d+))?/i);
      if (boxMatch) {
        const boxCount = parseInt(boxMatch[1] || '1', 10);
        const unitsInBox = parseInt(boxMatch[2] || '48', 10);
        qty = boxCount;
        presentation = `Box x ${unitsInBox} u.`;
        name = s.replace(boxMatch[0], '').replace(/^(?:de|\s)+/i, '').trim();
      } else if (s.match(/media\s+docena/i)) {
        qty = 1;
        presentation = 'Media Docena (6 u.)';
        name = s.replace(/media\s+docena(?:\s+de)?/i, '').trim();
      } else if (s.match(/(?:(\d+)\s*)?docena(?:s)?/i)) {
        const docMatch = s.match(/(?:(\d+)\s*)?docena(?:s)?/i);
        const docCount = parseInt(docMatch?.[1] || '1', 10);
        qty = docCount;
        presentation = docCount === 1 ? '1 Docena (12 u.)' : `${docCount} Docenas (${docCount * 12} u.)`;
        name = s.replace(docMatch?.[0] || '', '').replace(/^(?:de|\s)+/i, '').trim();
      } else {
        const numMatch = s.match(/^(\d+)\s+(.+)/);
        if (numMatch) {
          qty = parseInt(numMatch[1], 10);
          name = numMatch[2];
          presentation = 'Unidades';
        }
      }

      if (name.trim()) {
        items.push({
          nombre: name.trim().charAt(0).toUpperCase() + name.trim().slice(1),
          variante: presentation || 'Unidad',
          cantidad: qty,
          precioUnitario: 0,
        });
      }
    });

    if (items.length > 0) {
      return {
        reply: `✨ He armado tu lista con **${items.length} artículos** listos para registrar. Toca **«Cargar a Nuevo Pedido y Asignar Precios»** para transferirlos al formulario oficial:`,
        suggestedOrder: {
          productos: items,
          cliente: 'Cliente TikTok / Mostrador',
          pagado: 0,
          total: 0,
          saldo: 0,
        },
        suggestedActions: [
          'Cargar a Nuevo Pedido',
          'Agregar más artículos',
        ],
      };
    }

    return {
      reply: '¡Hola! Dicta tus productos por voz o texto (ej: *«1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio»*) y los prepararé automáticamente para ti.',
      suggestedActions: ['📦 1 box de 48 gomas Kitty + 1 docena bolígrafos', '💡 Ver Guía de Dictado'],
    };
  };

  const handleConfirmAndRegisterDirect = (msgId: string, suggested: VikaSuggestedOrder) => {
    if (!onSaveDirectOrder) return;
    const nextNumber = getNextOrderNumber(orders);
    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orderNumber: nextNumber,
      cliente: suggested.cliente || 'Cliente Mostrador / TikTok',
      telefono: suggested.telefono || '',
      lugarEntrega: suggested.lugarEntrega || '',
      observaciones: suggested.observaciones || 'Registrado con asistente VIKA IA',
      productos: suggested.productos.map((p, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        nombre: p.nombre,
        variante: p.variante || '',
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario || 0,
      })),
      total: suggested.total || 0,
      pagado: suggested.pagado || 0,
      saldo: (suggested.total || 0) - (suggested.pagado || 0),
      estado: 'Abierto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveDirectOrder(newOrder);

    // Update message state with confirmation
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              registeredOrderId: newOrder.id,
              registeredOrderNumber: newOrder.orderNumber,
            }
          : m
      )
    );
  };

  const renderFormattedText = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className={isDark ? 'text-white font-bold' : 'text-[#1A2B5C] font-bold'}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <em key={i} className={isDark ? 'text-[#FF6FA5] font-semibold' : 'text-[#1A2B5C] font-semibold'}>
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
      </p>
    );
  };

  return (
    <>
      <div
        id="vika-assistant-modal-backdrop"
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      >
        <div
          id="vika-assistant-modal"
          className={`border w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl h-[88vh] sm:h-[82vh] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          {/* Top Bar Header */}
          <div
            className={`p-3.5 sm:p-4 border-b flex items-center justify-between shadow-sm ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368] text-white'
                : 'bg-[#1A2B5C] border-[#1A2B5C] text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-md shrink-0 backdrop-blur-md">
                <Bot className="w-5 h-5 text-pink-300" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black font-['Outfit',sans-serif] flex items-center gap-1.5 leading-tight">
                  <span>VIKA · Asistente IA de Ventas</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                    Bolivia 🇧🇴
                  </span>
                </h2>
                <p className="text-[11px] text-white/80 font-medium">
                  Dictado por voz para Boxes, Docenas y Venta Rápida
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition flex items-center gap-1 cursor-pointer"
                title="Ver guía de dictado y ejemplos"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Guía</span>
              </button>

              <button
                onClick={() => {
                  setMessages([
                    {
                      id: 'welcome-reset',
                      sender: 'vika',
                      text: 'Conversación reiniciada. Dicta tus artículos (ej: *«1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio»*).',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      suggestedActions: [
                        '1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio + 1 box de 24 tajadores Kuromi',
                        '2 docenas libretas Kuromi + media docena estuches Stitch',
                        '💡 Ver Guía de Dictado',
                      ],
                    },
                  ]);
                }}
                title="Limpiar chat"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div
            className={`px-3 py-2 border-b overflow-x-auto scrollbar-none flex gap-1.5 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (p.includes('Guía') || p.includes('dictar')) {
                    setIsGuideOpen(true);
                  } else {
                    handleSendMessage(p.replace(/^[^\w]+/, ''));
                  }
                }}
                disabled={isLoading}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium transition active:scale-95 border cursor-pointer ${
                  isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                    : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              isDark ? 'bg-[#0F1B3C]/50' : 'bg-[#FBF7EF]/40'
            }`}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {msg.sender === 'user' ? 'Tú' : 'VIKA'}
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-[#9AA6C9]/60' : 'text-[#78716C]/60'}`}>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-sm ${
                    msg.sender === 'user'
                      ? isDark
                        ? 'bg-[#FF6FA5] text-[#0F1B3C] font-semibold rounded-tr-sm'
                        : 'bg-[#1A2B5C] text-white rounded-tr-sm'
                      : isDark
                      ? 'bg-[#16234F] border border-[#223368] text-slate-100 rounded-tl-sm'
                      : 'bg-white border border-[#E8DFC8] text-[#1A2B5C] rounded-tl-sm'
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Suggested Order Review & Registration Card */}
                  {msg.suggestedOrder && msg.suggestedOrder.productos?.length > 0 && (
                    <div
                      className={`mt-3 pt-3 border-t rounded-2xl p-3.5 space-y-3 shadow-inner ${
                        isDark
                          ? 'border-[#223368] bg-[#0F1B3C]'
                          : 'border-[#E8DFC8] bg-[#FBF7EF]'
                      }`}
                    >
                      <div className={`flex items-center justify-between border-b pb-2 ${
                        isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                      }`}>
                        <span className={`text-xs font-bold flex items-center gap-1.5 font-['Outfit',sans-serif] ${
                          isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                        }`}>
                          <ShoppingBag className="w-4 h-4 text-emerald-500" />
                          Lista de Artículos Dictados ({msg.suggestedOrder.productos.length})
                        </span>
                        {msg.suggestedOrder.total && msg.suggestedOrder.total > 0 ? (
                          <span className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            Total: {formatCurrency(msg.suggestedOrder.total)}
                          </span>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            Precios a asignar en formulario
                          </span>
                        )}
                      </div>

                      {/* Customer & Delivery details if extracted */}
                      {(msg.suggestedOrder.cliente || msg.suggestedOrder.telefono || msg.suggestedOrder.lugarEntrega) && (
                        <div
                          className={`rounded-xl p-2.5 text-[11px] space-y-1 border ${
                            isDark
                              ? 'bg-[#16234F] text-slate-300 border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          {msg.suggestedOrder.cliente && (
                            <div className="flex items-center gap-1.5 font-semibold">
                              <User className="w-3 h-3 text-emerald-500" />
                              <span>Cliente: {msg.suggestedOrder.cliente}</span>
                            </div>
                          )}
                          {msg.suggestedOrder.telefono && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>WhatsApp: {formatBoliviaPhone(msg.suggestedOrder.telefono)}</span>
                            </div>
                          )}
                          {msg.suggestedOrder.lugarEntrega && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-amber-500" />
                              <span>Entrega: {msg.suggestedOrder.lugarEntrega}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Products breakdown */}
                      <div className={`space-y-2 divide-y text-xs ${isDark ? 'divide-[#223368]' : 'divide-[#E8DFC8]'}`}>
                        {msg.suggestedOrder.productos.map((prod, pIdx) => {
                          return (
                            <div
                              key={pIdx}
                              className="pt-2 first:pt-0 flex items-center justify-between gap-2"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                                    {prod.cantidad}x {prod.nombre}
                                  </span>
                                  {prod.variante && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                                        isDark
                                          ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                                          : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
                                      }`}
                                    >
                                      {prod.variante}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[11px] font-mono ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                                {prod.precioUnitario > 0
                                  ? formatCurrency(prod.precioUnitario)
                                  : 'Bs. 0.00'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Primary Actions */}
                      {msg.registeredOrderNumber ? (
                        <div
                          className={`p-3 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${
                            isDark
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>¡Pedido #{msg.registeredOrderNumber} registrado en el sistema con éxito!</span>
                        </div>
                      ) : (
                        <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.suggestedOrder) {
                                onTransferToNewOrder(msg.suggestedOrder);
                                onClose();
                              }
                            }}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition cursor-pointer ${
                              isDark
                                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                            }`}
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Cargar a Nuevo Pedido y Asignar Precios</span>
                          </button>

                          {msg.suggestedOrder.total && msg.suggestedOrder.total > 0 && onSaveDirectOrder && (
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmAndRegisterDirect(msg.id, msg.suggestedOrder!)
                              }
                              className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer ${
                                isDark
                                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Registrar Directo (Total: {formatCurrency(msg.suggestedOrder.total)})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Calculations Card */}
                  {msg.quickCalculations && (
                    <div className={`mt-2.5 pt-2.5 border-t flex flex-wrap gap-2 text-xs ${
                      isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                    }`}>
                      {msg.quickCalculations.totalBs !== undefined && (
                        <span className={`px-2 py-1 rounded font-bold border ${
                          isDark
                            ? 'bg-[#0F1B3C] text-cyan-300 border-[#223368]'
                            : 'bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
                        }`}>
                          Total: {formatCurrency(msg.quickCalculations.totalBs)}
                        </span>
                      )}
                      {msg.quickCalculations.cambioBs !== undefined && (
                        <span className={`px-2 py-1 rounded font-bold border ${
                          isDark
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          Vuelto: {formatCurrency(msg.quickCalculations.cambioBs)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons suggested by VIKA */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                    {msg.suggestedActions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          if (act.includes('Guía')) {
                            setIsGuideOpen(true);
                          } else {
                            handleSendMessage(act);
                          }
                        }}
                        className={`px-2.5 py-1 border rounded-full text-[11px] font-medium transition active:scale-95 cursor-pointer ${
                          isDark
                            ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-[#FF6FA5] border-[#223368]'
                            : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div
                className={`flex items-center gap-2 p-3 border rounded-2xl max-w-xs text-xs animate-pulse ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 animate-spin ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                <span>VIKA está armando tu lista de artículos...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Bar */}
          <div
            className={`p-3 border-t space-y-2 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            {isListening && (
              <div
                className={`flex items-center justify-between px-3.5 py-2 border rounded-xl text-xs animate-pulse ${
                  isDark
                    ? 'bg-[#16234F] border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-semibold">🎙️ Dictando... Di tus cajas, docenas y unidades</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-lg shadow active:scale-95 cursor-pointer"
                >
                  Listo / Enviar
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-3 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-md'
                    : isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-[#FF6FA5] border border-[#223368]'
                    : 'bg-white hover:bg-[#E8DFC8] text-[#1A2B5C] border border-[#E8DFC8]'
                }`}
                title={isListening ? 'Detener micrófono' : 'Hablarle a VIKA por voz'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ej. '1 box de 48 de gomas Kitty más 1 docena de bolígrafos Sanrio'..."
                className={`flex-1 border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-sm cursor-pointer ${
                  isDark
                    ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                    : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      <VikaGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectPrompt={(text) => handleSendMessage(text)}
      />
    </>
  );
};
