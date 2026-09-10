import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShoppingBag,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sun,
  Moon,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Clock,
  Copy,
  CheckCheck,
  QrCode,
  Fingerprint,
  Laptop,
} from 'lucide-react';
import { buildTotpUri, generateQrCodeDataUrl } from '../lib/totp';
import {
  isWebAuthnSupported,
  verifyBiometricPasskey,
  getSavedBiometricDevice,
  removeSavedBiometricDevice,
  registerBiometricPasskey,
  saveBiometricDevice,
} from '../lib/webauthn';
import { SavedBiometricDevice } from '../types';

export const LoginScreen: React.FC = () => {
  const { login, resetJefePassword, loginWithBiometrics, enableBiometricOnDevice } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Biometrics (WebAuthn / Passkeys) state
  const [savedBiometricDevice, setSavedBiometricDevice] = useState<SavedBiometricDevice | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  // Forced WebAuthn Setup state (Admin required Huella Digital)
  const [isForcedWebAuthnStep, setIsForcedWebAuthnStep] = useState(false);
  const [webAuthnTargetUid, setWebAuthnTargetUid] = useState<string>('');
  const [webAuthnTargetName, setWebAuthnTargetName] = useState<string>('');
  const [webAuthnSetupLoading, setWebAuthnSetupLoading] = useState(false);
  const [webAuthnSetupError, setWebAuthnSetupError] = useState<string | null>(null);

  // Inactivity logout banner notification
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);

  // 2FA TOTP state
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserName, setTwoFactorUserName] = useState('');

  // 2FA Forced Setup state (Admin required 2FA)
  const [isForcedSetupStep, setIsForcedSetupStep] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Secure reset password state for Jefe
  const [showResetJefeModal, setShowResetJefeModal] = useState(false);
  const [newJefePass, setNewJefePass] = useState('');
  const [confirmJefePass, setConfirmJefePass] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const reason = sessionStorage.getItem('ventasia_logged_out_reason');
    const mins = sessionStorage.getItem('ventasia_inactivity_minutes') || '20';
    if (reason === 'inactivity') {
      setInactivityNotice(
        `Tu sesión se cerró automáticamente tras ${mins} minutos de inactividad (sin interacción) para proteger los datos del sistema.`
      );
      sessionStorage.removeItem('ventasia_logged_out_reason');
      sessionStorage.removeItem('ventasia_inactivity_minutes');
    }

    // Check for saved biometric credentials on this device
    setIsBiometricSupported(isWebAuthnSupported());
    const saved = getSavedBiometricDevice();
    if (saved) {
      setSavedBiometricDevice(saved);
      if (!email) {
        setEmail(saved.email);
      }
    }
  }, []);

  const handleBiometricLogin = async () => {
    if (!savedBiometricDevice) return;
    try {
      setBiometricLoading(true);
      setBiometricError(null);
      setError(null);
      setBiometricSuccess(false);

      // Trigger native browser Touch ID / Android fingerprint / Windows Hello
      await verifyBiometricPasskey(savedBiometricDevice.credentialId);

      setBiometricSuccess(true);
      await loginWithBiometrics(savedBiometricDevice);
    } catch (err: any) {
      console.error('Biometric authentication error:', err);
      setBiometricError(err.message || 'No se pudo verificar la huella digital.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleUnlinkBiometricsOnThisDevice = () => {
    removeSavedBiometricDevice();
    setSavedBiometricDevice(null);
    setBiometricError(null);
  };

  const handleCopySecret = async () => {
    if (!setupSecret) return;
    try {
      await navigator.clipboard.writeText(setupSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } catch {}
  };

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
      const res = await login(trimmedEmail, password);
      if (res && res.require2FASetup) {
        setIsForcedSetupStep(true);
        setIs2FAStep(false);
        setIsForcedWebAuthnStep(false);
        setTwoFactorUserName(res.userDisplayName || trimmedEmail);
        setSetupSecret(res.setupSecret || '');
        setTwoFactorCode('');
        setError(null);
        if (res.setupSecret) {
          const uri = buildTotpUri(trimmedEmail, res.setupSecret);
          generateQrCodeDataUrl(uri, isDark).then(setSetupQrDataUrl).catch(console.error);
        }
      } else if (res && res.require2FA) {
        setIs2FAStep(true);
        setIsForcedSetupStep(false);
        setIsForcedWebAuthnStep(false);
        setTwoFactorUserName(res.userDisplayName || trimmedEmail);
        setTwoFactorCode('');
        setError(null);
      } else if (res && res.requireWebAuthnSetup) {
        setIsForcedWebAuthnStep(true);
        setIs2FAStep(false);
        setIsForcedSetupStep(false);
        setWebAuthnTargetUid(res.userUid || '');
        setWebAuthnTargetName(res.userDisplayName || trimmedEmail);
        setWebAuthnSetupError(null);
        setError(null);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Error al iniciar sesión. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim() || twoFactorCode.trim().length !== 6) {
      setError('Por favor ingresa el código de 6 dígitos que muestra tu app.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let res;
      if (isForcedSetupStep) {
        res = await login(email.trim(), password, twoFactorCode.trim(), setupSecret);
      } else {
        res = await login(email.trim(), password, twoFactorCode.trim());
      }
      if (res && res.requireWebAuthnSetup) {
        setIsForcedWebAuthnStep(true);
        setIs2FAStep(false);
        setIsForcedSetupStep(false);
        setWebAuthnTargetUid(res.userUid || '');
        setWebAuthnTargetName(res.userDisplayName || email.trim());
        setWebAuthnSetupError(null);
        setError(null);
      }
    } catch (err: any) {
      console.error('2FA error:', err);
      setError(err.message || 'Código 2FA incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollForcedBiometrics = async () => {
    try {
      setWebAuthnSetupLoading(true);
      setWebAuthnSetupError(null);
      const reg = await registerBiometricPasskey({
        uid: webAuthnTargetUid || 'user',
        email: email.trim(),
        displayName: webAuthnTargetName || email.trim(),
      });

      // Save locally to device
      saveBiometricDevice({
        uid: webAuthnTargetUid || 'user',
        email: email.trim(),
        displayName: webAuthnTargetName || email.trim(),
        credentialId: reg.credentialId,
        deviceName: reg.deviceName,
        registeredAt: reg.createdAt,
      });

      // Complete login skipping the check now that it's registered
      await login(email.trim(), password, undefined, undefined, true);

      // Save to user doc in Firestore
      await enableBiometricOnDevice({
        id: reg.credentialId,
        deviceName: reg.deviceName,
        createdAt: reg.createdAt,
      });
    } catch (err: any) {
      console.error('Biometric enrollment error:', err);
      setWebAuthnSetupError(err.message || 'No se pudo registrar la huella digital en este dispositivo.');
    } finally {
      setWebAuthnSetupLoading(false);
    }
  };

  const handleSkipForcedBiometrics = async () => {
    try {
      setWebAuthnSetupLoading(true);
      await login(email.trim(), password, undefined, undefined, true);
    } catch (err: any) {
      setError(err.message || 'Error al ingresar.');
    } finally {
      setWebAuthnSetupLoading(false);
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

        {/* Inactivity Notice Alert */}
        {inactivityNotice && (
          <div
            className={`p-3.5 border rounded-2xl text-xs space-y-1 ${
              isDark
                ? 'bg-amber-950/80 border-amber-600/50 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-bold block">Sesión cerrada por inactividad</span>
                <span className="leading-tight opacity-90">{inactivityNotice}</span>
              </div>
            </div>
          </div>
        )}

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

            {isJefeEmail && !is2FAStep && (
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

        {/* Form: Step 2A (2FA Forced Setup) OR Step 2B (2FA Verification) OR Step 1 (Email & Password / Biometrics) */}
        {isForcedSetupStep ? (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div
              className={`p-3.5 rounded-2xl border text-center space-y-1.5 ${
                isDark ? 'bg-[#0F1B3C] border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="inline-flex p-2 rounded-xl bg-amber-500/15 text-amber-500 mb-1">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Configuración Obligatoria de 2FA
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Hola, <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>{twoFactorUserName}</strong>. La administración requiere que vincules tu celular con una app autenticadora (Google Authenticator, Authy, etc.) antes de continuar.
              </p>
            </div>
            {/* resto del setup forzado se mantiene */}

            {/* QR Code Container */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 ${
                isDark ? 'bg-[#0F1B3C]/70 border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <p className={`text-[11px] font-semibold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                1. Escanea este código QR con tu celular:
              </p>
              {setupQrDataUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-md border border-neutral-200 inline-block">
                  <img
                    src={setupQrDataUrl}
                    alt="Código QR para 2FA"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-neutral-400">
                  Generando código QR...
                </div>
              )}

              {/* Secret code backup */}
              <div className="w-full mt-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 px-1">
                  <span>¿No puedes escanear? Clave manual:</span>
                  {copiedSecret && <span className="text-emerald-500 font-bold">¡Copiada!</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <code
                    className={`flex-1 px-2 py-1 rounded-lg text-center font-mono text-xs font-bold tracking-wider select-all truncate ${
                      isDark ? 'bg-neutral-800 text-amber-300' : 'bg-neutral-100 text-amber-700'
                    }`}
                  >
                    {setupSecret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    title="Copiar clave secreta"
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      isDark
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {copiedSecret ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="login-setup-code-input"
                className={`block text-xs font-bold uppercase tracking-wider mb-1.5 text-center ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                2. Ingresa el código de 6 dígitos que muestra tu app
              </label>
              <div className="relative">
                <Smartphone
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                />
                <input
                  id="login-setup-code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`w-full border rounded-xl py-3 pl-10 pr-4 text-center font-mono text-xl tracking-[0.4em] font-bold focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/40 focus:ring-2 focus:ring-amber-400'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/40 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
              </div>
            </div>

            <button
              id="login-setup-submit-btn"
              type="submit"
              disabled={loading || twoFactorCode.length !== 6}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm active:scale-95 shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                isDark
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/25 border border-amber-400'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Vincular y Continuar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForcedSetupStep(false);
                setTwoFactorCode('');
                setSetupSecret('');
                setSetupQrDataUrl(null);
                setError(null);
              }}
              className={`w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a ingresar correo o contraseña</span>
            </button>
          </form>
        ) : is2FAStep ? (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div
              className={`p-3.5 rounded-2xl border text-center space-y-1.5 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FAF8F5] border-[#E8DFC8]'
              }`}
            >
              <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 text-emerald-500 mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Doble Factor de Autenticación (2FA)
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Hola, <strong className="text-white dark:text-white">{twoFactorUserName}</strong>. Ingresa el código de 6 dígitos que muestra tu app autenticadora (Google Authenticator, Authy, etc.).
              </p>
            </div>

            <div>
              <label
                htmlFor="login-2fa-code-input"
                className={`block text-xs font-bold uppercase tracking-wider mb-1.5 text-center ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Código de Seguridad (6 dígitos)
              </label>
              <div className="relative">
                <Smartphone
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                />
                <input
                  id="login-2fa-code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`w-full border rounded-xl py-3.5 pl-10 pr-4 text-center font-mono text-xl tracking-[0.4em] font-bold focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/40 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/40 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
              </div>
              <p className={`text-[11px] text-center mt-1.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                ⏱️ El código cambia automáticamente cada 30 segundos.
              </p>
            </div>

            <button
              id="login-2fa-submit-btn"
              type="submit"
              disabled={loading || twoFactorCode.length !== 6}
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
                  <span>Verificar e Ingresar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIs2FAStep(false);
                setTwoFactorCode('');
                setError(null);
              }}
              className={`w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a ingresar correo o contraseña</span>
            </button>
          </form>
        ) : isForcedWebAuthnStep ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-2xl border text-center space-y-2 ${
                isDark
                  ? 'bg-gradient-to-b from-[#1A2855] to-[#0F1B3C] border-[#FF6FA5]/40 shadow-lg shadow-[#FF6FA5]/5'
                  : 'bg-gradient-to-b from-[#FFF5F8] to-[#FDFBF7] border-[#FF6FA5]/40 shadow-md'
              }`}
            >
              <div className="inline-flex p-3 rounded-2xl bg-[#FF6FA5]/15 text-[#FF6FA5] mb-1">
                <Fingerprint className="w-8 h-8" />
              </div>
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Huella Digital Requerida por Administración
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Hola, <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>{webAuthnTargetName}</strong>. La administración ha establecido que es <span className="font-bold text-[#FF6FA5]">obligatorio</span> activar el acceso con huella digital o biometría en este dispositivo para tu cuenta.
              </p>
            </div>

            {webAuthnSetupError && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-start gap-2 ${
                  isDark ? 'bg-rose-950/80 border-rose-600/50 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{webAuthnSetupError}</span>
              </div>
            )}

            {isBiometricSupported ? (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl border text-xs text-left space-y-1 ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]' : 'bg-[#FAF8F5] border-[#E8DFC8] text-[#78716C]'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Sensor biométrico detectado en este navegador
                  </p>
                  <p className="text-[11px] leading-tight opacity-90">
                    Al presionar el botón a continuación, el navegador te solicitará colocar tu dedo en el sensor o mirar a la cámara (Touch ID, Windows Hello o sensor de tu smartphone).
                  </p>
                </div>

                <button
                  id="enroll-forced-biometrics-btn"
                  type="button"
                  onClick={handleEnrollForcedBiometrics}
                  disabled={webAuthnSetupLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm active:scale-95 shadow-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                      : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
                  }`}
                >
                  {webAuthnSetupLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Esperando sensor biométrico...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Vincular Huella Digital Ahora</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSkipForcedBiometrics}
                    disabled={webAuthnSetupLoading}
                    className={`text-xs underline transition cursor-pointer ${
                      isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                    }`}
                  >
                    Continuar sin huella (este equipo no cuenta con sensor biométrico)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    isDark ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-amber-500" />
                    Sin sensor biométrico WebAuthn disponible
                  </p>
                  <p className="text-[11px] leading-tight opacity-90">
                    Tu navegador o equipo actual no cuenta con hardware biométrico nativo (WebAuthn). Podrás vincular tu huella más adelante desde tu celular o una computadora compatible.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSkipForcedBiometrics}
                  disabled={webAuthnSetupLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition cursor-pointer ${
                    isDark
                      ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border border-[#223368]'
                      : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border border-[#E8DFC8]'
                  }`}
                >
                  Continuar al sistema sin huella en este equipo
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForcedWebAuthnStep(false);
                setError(null);
              }}
              className={`w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a ingresar correo o contraseña</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Biometric Quick Login for Saved Device */}
            {savedBiometricDevice && (
              <div
                className={`p-4 rounded-2xl border text-center space-y-3 relative overflow-hidden transition-all ${
                  isDark
                    ? 'bg-gradient-to-b from-[#1A2855] to-[#0F1B3C] border-[#FF6FA5]/40 shadow-lg shadow-[#FF6FA5]/5'
                    : 'bg-gradient-to-b from-[#FFF5F8] to-[#FDFBF7] border-[#FF6FA5]/40 shadow-md'
                }`}
              >
                <div className="flex items-center justify-center">
                  <button
                    id="biometric-icon-trigger-btn"
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    title="Tocar sensor biométrico para entrar"
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 group ${
                      isDark
                        ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/30'
                        : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/30'
                    }`}
                  >
                    {biometricLoading ? (
                      <div className="w-7 h-7 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Fingerprint className="w-9 h-9 group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>

                <div>
                  <h3 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Acceso con Huella Digital
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Hola, <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>{savedBiometricDevice.displayName}</strong>
                  </p>
                  <p className={`text-[10px] mt-0.5 opacity-80 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {savedBiometricDevice.email} · {savedBiometricDevice.deviceName}
                  </p>
                </div>

                {biometricError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium text-left flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{biometricError}</span>
                  </div>
                )}

                <button
                  id="biometric-login-btn"
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs active:scale-95 shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/20'
                      : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/20'
                  }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    {biometricLoading
                      ? 'Esperando sensor biométrico...'
                      : 'Tocar sensor de huella para ingresar'}
                  </span>
                </button>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('login-password-input')?.focus();
                    }}
                    className={`underline cursor-pointer transition ${
                      isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                    }`}
                  >
                    O escribir contraseña
                  </button>

                  <button
                    type="button"
                    onClick={handleUnlinkBiometricsOnThisDevice}
                    className="text-rose-400 hover:text-rose-500 cursor-pointer transition text-[11px]"
                    title="Olvidar registro en este navegador"
                  >
                    Cambiar de usuario
                  </button>
                </div>
              </div>
            )}

            {savedBiometricDevice && (
              <div className="relative flex py-1 items-center">
                <div className={`flex-grow border-t ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}></div>
                <span
                  className={`flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  o ingresa con contraseña
                </span>
                <div className={`flex-grow border-t ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}></div>
              </div>
            )}

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

              {!savedBiometricDevice && (
                <p className={`text-[11px] text-center leading-tight pt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  ✨ Puedes activar acceso con tu huella digital o Face ID desde tu perfil una vez inicies sesión en este equipo.
                </p>
              )}
            </form>
          </div>
        )}
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
