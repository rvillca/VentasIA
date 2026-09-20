import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { verifyAdminApprovalPin } from '../lib/orderSecurity';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface AdminApprovalPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
  orderNumber?: number;
  actionDescription?: string;
}

export const AdminApprovalPinModal: React.FC<AdminApprovalPinModalProps> = ({
  isOpen,
  onClose,
  onApproved,
  orderNumber,
  actionDescription = 'modificar o reabrir este pedido',
}) => {
  const { isDark } = useTheme();
  const { userProfile, isJefe } = useAuth();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setShowPin(false);
      setIsVerifying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Por favor ingresa el PIN de aprobación.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await verifyAdminApprovalPin(pin.trim());
      if (isValid) {
        setIsVerifying(false);
        onApproved();
      } else {
        setIsVerifying(false);
        setError('PIN incorrecto. Solicita a la Administración su PIN de autorización.');
        inputRef.current?.select();
      }
    } catch (err: any) {
      setIsVerifying(false);
      setError('Ocurrió un error al verificar el PIN. Inténtalo de nuevo.');
    }
  };

  return (
    <div
      id="admin-pin-approval-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="admin-pin-approval-modal-content"
        className={`border rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 transition-all ${
          isDark
            ? 'bg-[#16234F] border-[#FF6FA5]/40 text-white'
            : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with security icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-[#FF6FA5]/15 border-[#FF6FA5]/30 text-[#FF6FA5]'
                  : 'bg-rose-50 border-rose-200 text-[#C2410C]'
              }`}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className={`text-[10px] uppercase font-black tracking-wider block ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#C2410C]'
              }`}>
                Seguridad de Registros (+7 días)
              </span>
              <h3 className={`text-lg font-extrabold font-['Outfit',sans-serif] leading-tight ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                Aprobación Requerida
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white'
                : 'bg-[#F5EFE0] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Explanation */}
        <div
          className={`p-4 rounded-2xl border space-y-2 text-xs leading-relaxed ${
            isDark
              ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
              : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-amber-500">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              {orderNumber ? `Pedido #${orderNumber} Protegido` : 'Registro Protegido'}
            </span>
          </div>
          <p>
            Este pedido fue marcado como <strong>Entregado hace más de 7 días</strong>. Por norma de seguridad y protección contable, las ventas entregadas quedan bloqueadas.
          </p>
          <p>
            Para <strong>{actionDescription}</strong>, el/la supervisor(a) debe contar con la autorización de la <strong>Administración</strong> ingresando el PIN de aprobación.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-approval-pin-input"
              className={`block text-xs font-bold ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              PIN de Seguridad de Administración:
            </label>
            <div className="relative">
              <KeyRound
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              />
              <input
                id="admin-approval-pin-input"
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ingresa el PIN (ej: 2026)"
                className={`w-full pl-10 pr-11 py-3 rounded-2xl border text-center font-mono text-xl tracking-[0.3em] font-black outline-none transition ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] focus:border-[#FF6FA5] text-white'
                    : 'bg-white border-[#E8DFC8] focus:border-[#1A2B5C] text-[#1A2B5C]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
                title={showPin ? 'Ocultar PIN' : 'Ver PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                  : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] border-[#E8DFC8] text-[#78716C]'
              }`}
            >
              Cancelar
            </button>

            <button
              id="submit-admin-pin-approval-btn"
              type="submit"
              disabled={isVerifying || !pin.trim()}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/20'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/20'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 shrink-0" />
                  <span>Autorizar y Desbloquear</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
