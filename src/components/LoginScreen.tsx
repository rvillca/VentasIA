import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShoppingBag,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon,
  KeyRound,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, resetJefePassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secure reset password state for Jefe
  const [showResetJefeModal, setShowResetJefeModal] = useState(false);
  const [newJefePass, setNewJefePass] = useState('');
  const [confirmJefePass, setConfirmJefePass] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor ingresa tu correo electrónico y tu contraseña.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const trimmedEmail = email.trim();
      await login(trimmedEmail, password);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Error al iniciar sesión. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetJefeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newJefePass.length < 4) {
      setResetError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newJefePass !== confirmJefePass) {
      setResetError('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }
    try {
      setResetLoading(true);
      setResetError(null);
      await resetJefePassword(newJefePass);
      setResetSuccess('¡Contraseña actualizada correctamente! Iniciando sesión...');
      setTimeout(async () => {
        try {
          await login('rvillca@outlook.com', newJefePass);
        } catch {}
      }, 1000);
    } catch (err: any) {
      setResetError(err.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setResetLoading(false);
    }
  };

  const isJefeEmail = email.trim().toLowerCase() === 'rvillca@outlook.com';

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#0F1B3C]' : 'bg-[#FBF7EF]'
      }`}
    >
      {/* Theme toggle button at top right */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition shadow-sm cursor-pointer ${
            isDark
              ? 'bg-[#16234F] text-[#FF6FA5] border-[#223368] hover:bg-[#1E2D5A]'
              : 'bg-white text-[#1A2B5C] border-[#E8DFC8] hover:bg-[#F5EFE0]'
          }`}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-[#1A2B5C]" />}
          <span className="hidden sm:inline">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>
      </div>

      {/* Ambient decorative elements */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-[#FF6FA5]/10' : 'bg-[#FF6FA5]/10'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-[#4FD1B5]/10' : 'bg-[#1A2B5C]/5'
        }`}
      />

      <div
        className={`w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1A2B5C] p-0.5 mx-auto shadow-xl flex items-center justify-center">
            <div
              className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                isDark ? 'bg-[#0F1B3C]' : 'bg-[#1A2B5C]'
              }`}
            >
              <ShoppingBag className="w-7 h-7 text-[#FF6FA5]" />
            </div>
          </div>
          <div className="pt-1">
            <h1
              className={`text-2xl font-black tracking-tight font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              Importadora <span className="text-[#FF6FA5]">Chiquiminisos</span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Sistema de Gestión y Ventas · Iniciar Sesión
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className={`p-3.5 border rounded-2xl text-xs space-y-2 ${
              isDark
                ? 'bg-rose-950/80 border-rose-600/50 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="font-medium leading-tight">{error}</span>
            </div>

            {isJefeEmail && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetJefeModal(true);
                    setNewJefePass('');
                    setConfirmJefePass('');
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                    isDark
                      ? 'border-rose-400/40 hover:bg-rose-900/50 text-rose-200'
                      : 'border-rose-300 hover:bg-rose-100 text-rose-900'
                  }`}
                >
                  ¿Olvidaste tu contraseña de Jefe? Restablecer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email-input"
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              />
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={`w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password-input"
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              Contraseña
            </label>

            <div className="relative">
              <Lock
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full border rounded-xl py-3 pl-10 pr-11 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition cursor-pointer ${
                  isDark
                    ? 'text-[#9AA6C9] hover:text-white'
                    : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-sm active:scale-95 shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Reset Jefe Password Modal */}
      {showResetJefeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl border ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Restablecer Contraseña
                  </h3>
                  <p className="text-[10px] opacity-70">rvillca@outlook.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetJefeModal(false)}
                className="text-xs p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetJefeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-80">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newJefePass}
                  onChange={(e) => setNewJefePass(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase mb-1 opacity-80">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmJefePass}
                  onChange={(e) => setConfirmJefePass(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetJefeModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    isDark
                      ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                      : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#FF6FA5] text-[#0F1B3C] hover:bg-[#ff85b3] shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Guardando...' : 'Guardar y Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
