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
  const [messages, setMessages] = useState<VikaMessage[]>([
    {
      id: 'welcome',
      sender: 'vika',
      text: '¡Hola! Soy **VIKA**, tu asistente para armar pedidos y listas de ventas 🇧🇴.\n\n🎙️ **Dicta tus artículos con sus presentaciones y cantidades:**\n• *«1 box de 48 de gomas Kitty más una docena de bolígrafos Sanrio más 1 box de 24 de tajadores Kuromi»*\n• Armaré la lista limpia y podrás **cargarla directo al formulario para asignarle los precios unitarios** y calcular el total en Bs.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        '1 box de 48 gomas Kitty + 1 docena bolígrafos Sanrio + 1 box de 24 tajadores Kuromi',
        '2 docenas libretas Kuromi + media docena estuches Stitch',
        '💡 Ver Guía de Dictado',
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Sync voice transcript to input live
  useEffect(() => {
    if (isListening) {
      const live = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
      const cleaned = cleanVoiceTranscript(live);
      if (cleaned) {
        setInputMessage(cleaned);
      }
    }
  }, [isListening, transcript, interimTranscript]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const raw = textToSend || inputMessage;
    const query = cleanVoiceTranscript(raw).trim();
    if (!query || isLoading) return;

    if (query.toLowerCase().includes('guía') || query.toLowerCase().includes('guia') || query.toLowerCase().includes('cómo dictar') || query.toLowerCase().includes('como dictar')) {
      setIsGuideOpen(true);
    }

    if (isListening) {
      stopListening();
    }

    const userMsg: VikaMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    resetTranscript();
    setIsLoading(true);

    try {
      const response = await fetch('/api/vika-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            orders,
            activeTab,
          },
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        const replyData = json.data;
        const vikaMsg: VikaMessage = {
          id: `v-${Date.now()}`,
          sender: 'vika',
          text: replyData.reply || 'Aquí tienes la lista organizada.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedOrder: replyData.suggestedOrder,
          quickCalculations: replyData.quickCalculations,
          suggestedActions: replyData.suggestedActions,
        };
        setMessages((prev) => [...prev, vikaMsg]);
      } else {
        throw new Error(json.error || 'Error al conectar con VIKA');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'vika',
          text: `⚠️ No pude procesar esa consulta momentáneamente: ${err.message || 'Intenta de nuevo'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
      const current = cleanVoiceTranscript(inputMessage || transcript).trim();
      if (current) {
        handleSendMessage(current);
      }
    } else {
      resetTranscript();
      setInputMessage('');
      startListening();
    }
  };

  // Direct Registration handler from chat (if prices are ready)
  const handleConfirmAndRegisterDirect = (messageId: string, orderData: VikaSuggestedOrder) => {
    if (!onSaveDirectOrder) return;

    const items: OrderItem[] = (orderData.productos || []).map((p, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      nombre: p.nombre || 'Artículo',
      variante: p.variante || '',
      cantidad: Math.max(1, p.cantidad || 1),
      precioUnitario: Math.max(0, p.precioUnitario || 0),
    }));

    const total = items.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
    const pagado = Math.max(0, orderData.pagado || 0);
    const saldo = Math.max(0, total - pagado);
    const nextNum = getNextOrderNumber(orders);

    const clientPhone = orderData.telefono ? formatBoliviaPhone(orderData.telefono) : '';

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orderNumber: nextNum,
      cliente: (orderData.cliente || '').trim() || 'Cliente Mostrador / TikTok',
      telefono: clientPhone,
      lugarEntrega: (orderData.lugarEntrega || '').trim(),
      observaciones: (orderData.observaciones || '').trim(),
      productos: items,
      total,
      pagado,
      saldo,
      estado: 'Abierto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveDirectOrder(newOrder);

    // Update message state to show registered status
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            registeredOrderId: newOrder.id,
            registeredOrderNumber: newOrder.orderNumber,
          };
        }
        return msg;
      })
    );
  };

  // Helper to format text with markdown bold
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm text-slate-100">
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-1.5" />;
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={i} className="leading-relaxed">
              {parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={idx} className="text-white font-bold">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div
        id="vika-assistant-overlay"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      >
        <div
          id="vika-assistant-card"
          className="bg-slate-900 border border-purple-500/40 w-full sm:max-w-2xl h-[92vh] sm:h-[640px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-purple-500/20"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/70 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white font-['Outfit',sans-serif] tracking-wide flex items-center gap-1.5">
                    VIKA
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      Copiloto de Pedidos
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dictado en Boxes, Docenas y Unidades · Bolivia 🇧🇴
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                title="Ver guía de dictado y ejemplos"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-300" />
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
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-950/60 px-3 py-2 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex gap-1.5">
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
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-purple-300 border border-slate-700/60 transition active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    {msg.sender === 'user' ? 'Tú' : 'VIKA'}
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-lg ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm ring-1 ring-white/5'
                  }`}
                >
                  {renderFormattedText(msg.text)}

                  {/* Suggested Order Review & Registration Card */}
                  {msg.suggestedOrder && msg.suggestedOrder.productos?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-500/30 bg-slate-950/80 rounded-2xl p-3.5 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-['Outfit',sans-serif]">
                          <ShoppingBag className="w-4 h-4 text-cyan-400" />
                          Lista de Artículos Dictados ({msg.suggestedOrder.productos.length})
                        </span>
                        {msg.suggestedOrder.total && msg.suggestedOrder.total > 0 ? (
                          <span className="text-xs font-black text-emerald-400">
                            Total: {formatCurrency(msg.suggestedOrder.total)}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            Precios a asignar en formulario
                          </span>
                        )}
                      </div>

                      {/* Customer & Delivery details if extracted */}
                      {(msg.suggestedOrder.cliente || msg.suggestedOrder.telefono || msg.suggestedOrder.lugarEntrega) && (
                        <div className="bg-slate-900/90 rounded-xl p-2.5 text-[11px] space-y-1 text-slate-300 border border-slate-800">
                          {msg.suggestedOrder.cliente && (
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              <User className="w-3 h-3 text-cyan-400" />
                              <span>Cliente: {msg.suggestedOrder.cliente}</span>
                            </div>
                          )}
                          {msg.suggestedOrder.telefono && (
                            <div className="flex items-center gap-1.5 text-cyan-300">
                              <Phone className="w-3 h-3" />
                              <span>WhatsApp: {formatBoliviaPhone(msg.suggestedOrder.telefono)}</span>
                            </div>
                          )}
                          {msg.suggestedOrder.lugarEntrega && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>Entrega: {msg.suggestedOrder.lugarEntrega}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Products breakdown */}
                      <div className="space-y-2 divide-y divide-slate-800/80 text-xs">
                        {msg.suggestedOrder.productos.map((prod, pIdx) => {
                          return (
                            <div
                              key={pIdx}
                              className="pt-2 first:pt-0 flex items-center justify-between gap-2"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs">
                                    {prod.cantidad}x {prod.nombre}
                                  </span>
                                  {prod.variante && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 font-medium">
                                      {prod.variante}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
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
                        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>¡Pedido #{msg.registeredOrderNumber} registrado en el sistema con éxito!</span>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.suggestedOrder) {
                                onTransferToNewOrder(msg.suggestedOrder);
                                onClose();
                              }
                            }}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 active:scale-98 transition"
                          >
                            <Edit3 className="w-4 h-4 text-cyan-200" />
                            <span>Cargar a Nuevo Pedido y Asignar Precios</span>
                          </button>

                          {msg.suggestedOrder.total && msg.suggestedOrder.total > 0 && onSaveDirectOrder && (
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmAndRegisterDirect(msg.id, msg.suggestedOrder!)
                              }
                              className="w-full py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Registrar Directo (Total: {formatCurrency(msg.suggestedOrder.total)})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Calculations Card */}
                  {msg.quickCalculations && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-wrap gap-2 text-xs">
                      {msg.quickCalculations.totalBs !== undefined && (
                        <span className="px-2 py-1 rounded bg-slate-950 text-cyan-300 font-bold border border-slate-800">
                          Total: {formatCurrency(msg.quickCalculations.totalBs)}
                        </span>
                      )}
                      {msg.quickCalculations.cambioBs !== undefined && (
                        <span className="px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/40">
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
                        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/50 rounded-full text-[11px] font-medium transition active:scale-95"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs text-xs text-purple-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>VIKA está armando tu lista de artículos...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
            {isListening && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-purple-950/90 border border-purple-500/50 rounded-xl text-xs text-purple-200 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="font-semibold">🎙️ Dictando... Di tus cajas, docenas y unidades</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className="text-[11px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1 rounded-lg shadow active:scale-95"
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
                className={`p-3 rounded-xl transition flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-white border border-slate-700'
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
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-lg shadow-purple-900/30"
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
