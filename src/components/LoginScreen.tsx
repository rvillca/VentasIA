import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShoppingBag,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

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
              Papelería y artículos Kawaii · Bolivia
            </p>
          </div>
        </div>

        {/* Roles notice badge */}
        <div
          className={`border rounded-2xl p-3.5 text-xs space-y-1 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]' : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 font-bold ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
            <span>Acceso al Sistema:</span>
          </div>
          <p className="text-[11px] leading-tight">
            Ingresa con tu correo y contraseña autorizada para acceder a tu panel de trabajo.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
              isDark
                ? 'bg-rose-950/80 border-rose-600/50 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className={`w-full border rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
    </div>
  );
};
