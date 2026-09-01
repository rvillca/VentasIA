import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  KeyRound,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, changeMyPassword } = useAuth();
  const { isDark } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || !confirmPassword) {
      setError('Por favor ingresa la nueva contraseña.');
      return;
    }

    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await changeMyPassword(currentPassword, newPassword);
      setSuccess('¡Contraseña actualizada exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Error al cambiar la contraseña. Verifica tu clave actual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="change-password-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="change-password-modal"
        className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
            }`}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                Cambiar Mi Contraseña
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Usuario: <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{currentUser?.email}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Contraseña Actual
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`} />
              <input
                id="current-password-input"
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu clave actual"
                className={`w-full border rounded-xl py-2.5 pl-9 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Nueva Contraseña
            </label>
            <div className="relative">
              <KeyRound className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`} />
              <input
                id="new-password-input"
                type={showNewPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva clave segura"
                className={`w-full border rounded-xl py-2.5 pl-9 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <KeyRound className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`} />
              <input
                id="confirm-new-password-input"
                type={showNewPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva clave"
                className={`w-full border rounded-xl py-2.5 pl-9 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                isDark
                  ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                  : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
              }`}
            >
              Cancelar
            </button>
            <button
              id="submit-change-password-btn"
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Clave</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
