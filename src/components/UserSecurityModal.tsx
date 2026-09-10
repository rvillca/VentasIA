import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  KeyRound,
  Clock,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Smartphone,
  RefreshCw,
  Fingerprint,
  Laptop,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { generateTotpSecret, buildTotpUri, generateQrCodeDataUrl } from '../lib/totp';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometricPasskey,
  verifyBiometricPasskey,
  getSavedBiometricDevice,
  removeSavedBiometricDevice,
} from '../lib/webauthn';
import { SavedBiometricDevice } from '../types';

interface UserSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: '2fa' | 'biometrics' | 'inactivity' | 'password';
}

export const UserSecurityModal: React.FC<UserSecurityModalProps> = ({
  isOpen,
  onClose,
  defaultTab = '2fa',
}) => {
  const {
    currentUser,
    userProfile,
    changeMyPassword,
    enableTwoFactor,
    disableTwoFactor,
    updateSecurityPreferences,
    enableBiometricOnDevice,
    disableBiometricOnDevice,
  } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'2fa' | 'biometrics' | 'inactivity' | 'password'>(defaultTab);

  // Biometrics (WebAuthn / Passkeys) State
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [savedBioDevice, setSavedBioDevice] = useState<SavedBiometricDevice | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioSuccess, setBioSuccess] = useState<string | null>(null);
  const [testBioSuccess, setTestBioSuccess] = useState<string | null>(null);

  // 2FA Setup State
  const [isConfiguring2FA, setIsConfiguring2FA] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // 2FA Deactivation State
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatePassOrCode, setDeactivatePassOrCode] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Inactivity State
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState<boolean>(
    userProfile?.autoLogoutEnabled !== false
  );
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState<number>(
    userProfile?.autoLogoutMinutes || 20
  );
  const [inactivityLoading, setInactivityLoading] = useState(false);
  const [inactivitySuccess, setInactivitySuccess] = useState<string | null>(null);
  const [inactivityError, setInactivityError] = useState<string | null>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Sync profile when opened or updated
  useEffect(() => {
    if (userProfile) {
      setAutoLogoutEnabled(userProfile.autoLogoutEnabled !== false);
      setAutoLogoutMinutes(userProfile.autoLogoutMinutes || 20);
    }
  }, [userProfile, isOpen]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Sync biometric availability and saved device on this browser
  useEffect(() => {
    if (isOpen) {
      const supported = isWebAuthnSupported();
      setIsBioSupported(supported);
      if (supported) {
        isPlatformAuthenticatorAvailable()
          .then(setIsPlatformAvailable)
          .catch(() => setIsPlatformAvailable(false));
      }
      setSavedBioDevice(getSavedBiometricDevice());
      setBioError(null);
      setBioSuccess(null);
      setTestBioSuccess(null);
    }
  }, [isOpen, userProfile]);

  const handleRegisterBiometrics = async () => {
    if (!currentUser) return;
    try {
      setBioLoading(true);
      setBioError(null);
      setBioSuccess(null);
      setTestBioSuccess(null);

      const res = await registerBiometricPasskey({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: userProfile?.displayName || currentUser.displayName || currentUser.email,
      });

      await enableBiometricOnDevice(res);
      setSavedBioDevice(getSavedBiometricDevice());
      setBioSuccess(
        '¡Acceso con huella digital activado exitosamente en este dispositivo! La próxima vez que inicies sesión desde este equipo, podrás tocar tu sensor biométrico para acceder al instante.'
      );
    } catch (err: any) {
      console.error('Biometric registration error:', err);
      setBioError(err.message || 'No se pudo vincular la huella digital en este dispositivo.');
    } finally {
      setBioLoading(false);
    }
  };

  const handleTestBiometrics = async () => {
    try {
      setBioLoading(true);
      setBioError(null);
      setTestBioSuccess(null);

      await verifyBiometricPasskey(savedBioDevice?.credentialId);
      setTestBioSuccess('¡Huella verificada correctamente! El sensor biométrico funciona con total precisión.');
    } catch (err: any) {
      setBioError(err.message || 'No se pudo verificar la huella.');
    } finally {
      setBioLoading(false);
    }
  };

  const handleRemoveBiometrics = async () => {
    try {
      setBioLoading(true);
      setBioError(null);
      setBioSuccess(null);
      setTestBioSuccess(null);

      await disableBiometricOnDevice(savedBioDevice?.credentialId);
      setSavedBioDevice(null);
      setBioSuccess('Se desvinculó el acceso con huella digital de este equipo.');
    } catch (err: any) {
      setBioError(err.message || 'Error al desvincular el sensor de este dispositivo.');
    } finally {
      setBioLoading(false);
    }
  };

  if (!isOpen) return null;

  // Initialize 2FA QR code generator
  const handleStart2FASetup = async () => {
    try {
      setTotpLoading(true);
      setTotpError(null);
      setTotpSuccess(null);
      const secret = generateTotpSecret();
      setSetupSecret(secret);
      const uri = buildTotpUri(currentUser?.email || 'usuario@chiquiminisos.bo', secret);
      const qrData = await generateQrCodeDataUrl(uri);
      setQrCodeUrl(qrData);
      setIsConfiguring2FA(true);
      setTotpVerificationCode('');
    } catch (err: any) {
      setTotpError('Error al inicializar el código 2FA: ' + (err.message || 'Error desconocido'));
    } finally {
      setTotpLoading(false);
    }
  };

  const handleConfirm2FAActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpVerificationCode.trim() || totpVerificationCode.trim().length !== 6) {
      setTotpError('Ingresa el código de 6 dígitos que muestra tu app.');
      return;
    }

    try {
      setTotpLoading(true);
      setTotpError(null);
      await enableTwoFactor(setupSecret, totpVerificationCode.trim());
      setTotpSuccess('¡Doble Factor (2FA) activado exitosamente! Tu cuenta ahora está protegida.');
      setIsConfiguring2FA(false);
      setSetupSecret('');
      setQrCodeUrl(null);
      setTotpVerificationCode('');
    } catch (err: any) {
      setTotpError(err.message || 'El código de 6 dígitos no es correcto. Intenta de nuevo.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDeactivate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatePassOrCode.trim()) {
      setDeactivateError('Ingresa tu contraseña o código de 6 dígitos para confirmar.');
      return;
    }

    try {
      setDeactivateLoading(true);
      setDeactivateError(null);
      await disableTwoFactor(deactivatePassOrCode.trim());
      setShowDeactivateConfirm(false);
      setDeactivatePassOrCode('');
      setTotpSuccess('Se desactivó el Doble Factor (2FA) de tu cuenta.');
    } catch (err: any) {
      setDeactivateError(err.message || 'Contraseña o código incorrecto.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleSaveInactivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInactivityLoading(true);
      setInactivityError(null);
      setInactivitySuccess(null);
      await updateSecurityPreferences({
        autoLogoutEnabled,
        autoLogoutMinutes: Number(autoLogoutMinutes),
      });
      setInactivitySuccess('Preferencia de cierre por inactividad guardada correctamente.');
      setTimeout(() => setInactivitySuccess(null), 2500);
    } catch (err: any) {
      setInactivityError(err.message || 'Error al guardar la preferencia.');
    } finally {
      setInactivityLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError('Por favor ingresa la nueva contraseña.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setPasswordLoading(true);
      await changeMyPassword(currentPassword, newPassword);
      setPasswordSuccess('¡Contraseña actualizada exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 2500);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña. Verifica tu clave actual.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    if (setupSecret) {
      navigator.clipboard.writeText(setupSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const is2FAActive = !!userProfile?.twoFactorEnabled;

  return (
    <div
      id="user-security-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="user-security-modal"
        className={`w-full max-w-lg border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <Shield className="w-5 h-5 text-[#FF6FA5]" />
            </div>
            <div>
              <h2
                className={`text-base font-bold font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Seguridad & Mi Cuenta
              </h2>
              <p className={`text-xs truncate max-w-[240px] sm:max-w-[320px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                {userProfile?.displayName || currentUser?.email}
              </p>
            </div>
          </div>

          <button
            id="close-security-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isDark
                ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#F5EFE0]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl border text-xs font-bold ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#F5EFE0] border-[#E8DFC8]'
          }`}
        >
          <button
            id="tab-security-2fa"
            type="button"
            onClick={() => {
              setActiveTab('2fa');
              setTotpError(null);
              setTotpSuccess(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === '2fa'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2FA (TOTP)</span>
          </button>

          <button
            id="tab-security-biometrics"
            type="button"
            onClick={() => {
              setActiveTab('biometrics');
              setBioError(null);
              setBioSuccess(null);
              setTestBioSuccess(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'biometrics'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Huella Digital</span>
          </button>

          <button
            id="tab-security-inactivity"
            type="button"
            onClick={() => {
              setActiveTab('inactivity');
              setInactivityError(null);
              setInactivitySuccess(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'inactivity'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Inactividad</span>
          </button>

          <button
            id="tab-security-password"
            type="button"
            onClick={() => {
              setActiveTab('password');
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'password'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Contraseña</span>
          </button>
        </div>

        {/* TAB 1: 2FA (TOTP) */}
        {activeTab === '2fa' && (
          <div className="space-y-4">
            {/* Status Alert */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                is2FAActive
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {is2FAActive ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-xs sm:text-sm">
                    {is2FAActive ? 'Doble Factor (2FA) Activado' : 'Doble Factor (2FA) Desactivado'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {is2FAActive
                      ? 'Tu cuenta está protegida con código TOTP de 6 dígitos'
                      : 'Protege tu cuenta con Google Authenticator o Authy'}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  is2FAActive
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isDark
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {is2FAActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {/* Notification messages */}
            {totpSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{totpSuccess}</span>
              </div>
            )}

            {totpError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{totpError}</span>
              </div>
            )}

            {/* If 2FA is NOT active and not configuring yet */}
            {!is2FAActive && !isConfiguring2FA && (
              <div className="space-y-3.5">
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
                    isDark ? 'bg-[#0F1B3C]/70 border-[#223368] text-[#CBD5E1]' : 'bg-[#FAF8F5] border-[#E8DFC8] text-[#57534E]'
                  }`}
                >
                  <p className="font-bold text-sm text-[#1A2B5C] dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#FF6FA5]" />
                    ¿Cómo funciona el estándar TOTP?
                  </p>
                  <p>
                    Usa cualquier app autenticadora como <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> o <strong>Authy</strong>.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li><strong>100% Gratuito:</strong> No utiliza mensajes SMS ni genera ningún costo por mensaje.</li>
                    <li><strong>Máxima Seguridad:</strong> Genera códigos de 6 dígitos que cambian cada 30 segundos.</li>
                    <li><strong>Funciona Offline:</strong> Tu app genera los códigos incluso sin conexión a internet en tu celular.</li>
                  </ul>
                </div>

                <button
                  id="start-2fa-setup-btn"
                  type="button"
                  onClick={handleStart2FASetup}
                  disabled={totpLoading}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#FF85B3] text-[#0F1B3C] shadow-[#FF6FA5]/20'
                      : 'bg-[#1A2B5C] hover:bg-[#253A7A] text-white shadow-[#1A2B5C]/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Configurar 2FA con App Autenticadora</span>
                </button>
              </div>
            )}

            {/* In-progress 2FA Setup Flow */}
            {!is2FAActive && isConfiguring2FA && qrCodeUrl && (
              <form onSubmit={handleConfirm2FAActivation} className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border space-y-3 text-center ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FAF8F5] border-[#E8DFC8]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-[#FF6FA5] uppercase tracking-wider">
                      Paso 1: Escanea este Código QR
                    </div>
                    <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      Abre Google Authenticator o Authy en tu celular y escanea este código:
                    </p>
                  </div>

                  {/* QR Image */}
                  <div className="inline-block p-2.5 bg-white rounded-2xl shadow-md border border-slate-200">
                    <img
                      src={qrCodeUrl}
                      alt="Código QR 2FA TOTP"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  {/* Manual Key */}
                  <div className="space-y-1 pt-1">
                    <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      ¿No puedes escanear? Ingresa esta clave manual:
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <code className="px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 font-mono text-xs font-bold tracking-wider select-all">
                        {setupSecret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecretToClipboard}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                          copiedKey
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : isDark
                            ? 'bg-[#16234F] border-[#223368] text-white hover:bg-[#1E2D5A]'
                            : 'bg-white border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#F5EFE0]'
                        }`}
                        title="Copiar clave secreta"
                      >
                        {copiedKey ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{copiedKey ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Verification Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="totp-verify-code-input"
                    className={`block text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  >
                    Paso 2: Ingresa el código de 6 dígitos que muestra tu app
                  </label>
                  <input
                    id="totp-verify-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={totpVerificationCode}
                    onChange={(e) => setTotpVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full text-center tracking-[0.4em] font-mono text-xl font-bold py-3 border rounded-xl focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                  <p className={`text-[10px] text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    El código cambia cada 30 segundos en tu aplicación.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfiguring2FA(false);
                      setTotpVerificationCode('');
                      setTotpError(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isDark
                        ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                        : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#F5EFE0]'
                    }`}
                  >
                    Cancelar
                  </button>

                  <button
                    id="submit-activate-2fa-btn"
                    type="submit"
                    disabled={totpLoading || totpVerificationCode.length !== 6}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-[#FF6FA5] hover:bg-[#FF85B3] text-[#0F1B3C]'
                        : 'bg-[#1A2B5C] hover:bg-[#253A7A] text-white'
                    }`}
                  >
                    {totpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Confirmar y Activar</span>
                  </button>
                </div>
              </form>
            )}

            {/* If 2FA is ACTIVE: Options to Deactivate or Re-scan */}
            {is2FAActive && (
              <div className="space-y-3 pt-1">
                {!showDeactivateConfirm ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      id="prompt-deactivate-2fa-btn"
                      type="button"
                      onClick={() => {
                        setShowDeactivateConfirm(true);
                        setDeactivatePassOrCode('');
                        setDeactivateError(null);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isDark
                          ? 'border-rose-500/40 text-rose-300 hover:bg-rose-950/40'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Desactivar 2FA
                    </button>

                    <button
                      id="reconfigure-2fa-btn"
                      type="button"
                      onClick={handleStart2FASetup}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isDark
                          ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                          : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#F5EFE0]'
                      }`}
                    >
                      Reconfigurar / Cambiar Móvil
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleDeactivate2FA} className="space-y-3 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5">
                    <div className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      ¿Confirmar desactivación de 2FA?
                    </div>
                    <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      Para desactivar el Doble Factor, ingresa tu contraseña actual o un código de 6 dígitos de tu app:
                    </p>

                    <input
                      id="deactivate-2fa-input"
                      type="password"
                      required
                      placeholder="Tu contraseña actual o código 2FA"
                      value={deactivatePassOrCode}
                      onChange={(e) => setDeactivatePassOrCode(e.target.value)}
                      className={`w-full py-2 px-3 text-xs border rounded-xl focus:outline-none transition ${
                        isDark
                          ? 'bg-[#0F1B3C] border-[#223368] text-white'
                          : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                      }`}
                    />

                    {deactivateError && (
                      <div className="text-xs text-rose-500 font-medium">
                        {deactivateError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeactivateConfirm(false)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold ${
                          isDark ? 'border-[#223368] text-[#9AA6C9]' : 'border-[#E8DFC8] text-[#78716C]'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        id="confirm-deactivate-2fa-btn"
                        type="submit"
                        disabled={deactivateLoading}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        {deactivateLoading ? 'Desactivando...' : 'Confirmar Desactivación'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: HUELLA DIGITAL / BIOMETRÍA (WebAuthn / Passkeys) */}
        {activeTab === 'biometrics' && (
          <div className="space-y-4">
            {/* Overview Banner */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
                isDark ? 'bg-[#0F1B3C]/70 border-[#223368] text-[#CBD5E1]' : 'bg-[#FAF8F5] border-[#E8DFC8] text-[#57534E]'
              }`}
            >
              <div className="font-bold text-sm text-[#1A2B5C] dark:text-white flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-[#FF6FA5]" />
                Acceso con Huella Digital / Biometría (Passkeys)
              </div>
              <p>
                Permite iniciar sesión rápidamente tocando el lector de huella dactilar o reconocimiento facial de tu celular, tablet o computadora (Touch ID, Windows Hello, Huella Android).
              </p>
              <p className="text-[11px] opacity-85">
                🔒 <strong>Seguridad nativa WebAuthn:</strong> Tus datos biométricos nunca se transmiten ni salen de tu equipo. El estándar criptográfico valida tu identidad de forma local y sin costo alguno.
              </p>
            </div>

            {bioSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-2.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span className="leading-snug">{bioSuccess}</span>
              </div>
            )}

            {testBioSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-2.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span className="leading-snug">{testBioSuccess}</span>
              </div>
            )}

            {bioError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{bioError}</span>
              </div>
            )}

            {/* Current Device Status */}
            <div
              className={`p-4 rounded-2xl border space-y-3.5 ${
                savedBioDevice
                  ? isDark
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-emerald-50/50 border-emerald-200'
                  : isDark
                  ? 'bg-[#0F1B3C] border-[#223368]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      savedBioDevice
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : isDark
                        ? 'bg-[#223368] text-[#9AA6C9]'
                        : 'bg-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>
                        Estado en este equipo:
                      </span>
                      {savedBioDevice ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
                          NO VINCULADO
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      {savedBioDevice
                        ? `Vinculado como: ${savedBioDevice.deviceName}`
                        : `Este dispositivo aún no tiene vinculada tu huella.`}
                    </p>
                  </div>
                </div>
              </div>

              {savedBioDevice ? (
                <div className="space-y-3 pt-2 border-t border-current/10">
                  <div className={`text-[11px] space-y-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    <p>
                      <strong>Vinculado el:</strong>{' '}
                      {new Date(savedBioDevice.registeredAt).toLocaleString('es-BO')}
                    </p>
                    <p>
                      <strong>Usuario:</strong> {savedBioDevice.displayName} ({savedBioDevice.email})
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      id="test-biometrics-btn"
                      type="button"
                      onClick={handleTestBiometrics}
                      disabled={bioLoading}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isDark
                          ? 'border-[#223368] text-white hover:bg-[#1A2B5C]'
                          : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-white'
                      }`}
                    >
                      <Fingerprint className="w-4 h-4 text-[#FF6FA5]" />
                      <span>Probar Sensor de Huella</span>
                    </button>

                    <button
                      id="remove-biometrics-btn"
                      type="button"
                      onClick={handleRemoveBiometrics}
                      disabled={bioLoading}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isDark
                          ? 'border-rose-500/30 text-rose-300 hover:bg-rose-950/40'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Desvincular de este equipo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {!isBioSupported && (
                    <p className="text-xs text-amber-500 font-medium">
                      ⚠️ Tu navegador actual no tiene habilitada la API WebAuthn. Te recomendamos usar Chrome, Edge o Safari en una pestaña normal.
                    </p>
                  )}

                  <button
                    id="register-biometrics-btn"
                    type="button"
                    onClick={handleRegisterBiometrics}
                    disabled={bioLoading}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs active:scale-95 shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
                      isDark
                        ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/20'
                        : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/20'
                    }`}
                  >
                    {bioLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        <span>Activar acceso con huella digital en este dispositivo</span>
                      </>
                    )}
                  </button>
                  <p className={`text-[11px] text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Al hacer clic, el navegador te pedirá tocar tu sensor de huella o presionar el botón de Touch ID / Windows Hello.
                  </p>
                </div>
              )}
            </div>

            {/* Other Devices registered list (from userProfile) */}
            {userProfile?.webAuthnCredentials && userProfile.webAuthnCredentials.length > 0 && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-2.5 ${
                  isDark ? 'bg-[#0F1B3C]/50 border-[#223368]' : 'bg-white border-[#E8DFC8]'
                }`}
              >
                <div className={`font-bold text-[11px] uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Equipos con huella vinculada ({userProfile.webAuthnCredentials.length})
                </div>
                <div className="space-y-2">
                  {userProfile.webAuthnCredentials.map((cred, idx) => (
                    <div
                      key={cred.id || idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        savedBioDevice?.credentialId === cred.id
                          ? isDark
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-emerald-200 bg-emerald-50/50'
                          : isDark
                          ? 'border-[#223368] bg-[#0A1229]'
                          : 'border-[#E8DFC8] bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Laptop className="w-4 h-4 shrink-0 text-[#FF6FA5]" />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                            {cred.deviceName || 'Dispositivo'}
                            {savedBioDevice?.credentialId === cred.id && (
                              <span className="ml-1.5 text-[10px] text-emerald-500 font-black">
                                (Este dispositivo)
                              </span>
                            )}
                          </p>
                          <p className={`text-[10px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                            Registrado: {new Date(cred.createdAt).toLocaleDateString('es-BO')}
                            {cred.lastUsedAt && ` • Último uso: ${new Date(cred.lastUsedAt).toLocaleDateString('es-BO')}`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => disableBiometricOnDevice(cred.id)}
                        title="Eliminar este dispositivo"
                        className={`p-1.5 rounded-lg border text-rose-500 transition cursor-pointer ${
                          isDark
                            ? 'border-[#223368] hover:bg-rose-950/40'
                            : 'border-[#E8DFC8] hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INACTIVITY TIMEOUT CONFIGURATION */}
        {activeTab === 'inactivity' && (
          <form onSubmit={handleSaveInactivity} className="space-y-4">
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
                isDark ? 'bg-[#0F1B3C]/70 border-[#223368] text-[#CBD5E1]' : 'bg-[#FAF8F5] border-[#E8DFC8] text-[#57534E]'
              }`}
            >
              <div className="font-bold text-sm text-[#1A2B5C] dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#FF6FA5]" />
                Cierre Automático por Inactividad
              </div>
              <p>
                Si no interactúas con el sistema (sin tocar nada ni mover el cursor) durante el tiempo seleccionado, la sesión se cerrará automáticamente y te redirigirá a la pantalla de inicio de sesión.
              </p>
              <p className="text-[11px] opacity-80">
                Esta función protege la confidencialidad de pedidos, clientes y precios si dejas la pantalla desatendida en la tienda o almacén.
              </p>
            </div>

            {inactivitySuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{inactivitySuccess}</span>
              </div>
            )}

            {inactivityError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{inactivityError}</span>
              </div>
            )}

            {/* Toggle Switch */}
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Activar Cierre por Inactividad
                </div>
                <div className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  {autoLogoutEnabled ? 'Protección activa' : 'Sesión permanece abierta continuamente'}
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="toggle-auto-logout-checkbox"
                  type="checkbox"
                  checked={autoLogoutEnabled}
                  onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6FA5]"></div>
              </label>
            </div>

            {/* Timeout Options */}
            {autoLogoutEnabled && (
              <div className="space-y-2">
                <label
                  className={`block text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Tiempo de inactividad permitido
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[15, 20, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAutoLogoutMinutes(mins)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                        autoLogoutMinutes === mins
                          ? isDark
                            ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5]'
                            : 'bg-[#1A2B5C] text-white border-[#1A2B5C]'
                          : isDark
                          ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white'
                          : 'bg-white border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                      }`}
                    >
                      <span className="text-sm font-black">{mins} min</span>
                      {mins === 20 && (
                        <span className="text-[9px] uppercase tracking-tight opacity-90">
                          Recomendado
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              id="save-inactivity-btn"
              type="submit"
              disabled={inactivityLoading}
              className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#FF85B3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253A7A] text-white'
              }`}
            >
              {inactivityLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Guardar Configuración de Inactividad</span>
            </button>
          </form>
        )}

        {/* TAB 3: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="security-current-password"
                className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  id="security-current-password"
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu clave actual"
                  className={`w-full border rounded-xl py-2.5 pl-3 pr-10 text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition ${
                    isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                  }`}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="security-new-password"
                className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="security-new-password"
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className={`w-full border rounded-xl py-2.5 pl-3 pr-10 text-xs focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition ${
                    isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                  }`}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="security-confirm-password"
                className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Confirmar Nueva Contraseña
              </label>
              <input
                id="security-confirm-password"
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className={`w-full border rounded-xl py-2.5 px-3 text-xs focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>

            <button
              id="submit-change-password-btn"
              type="submit"
              disabled={passwordLoading}
              className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#FF85B3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253A7A] text-white'
              }`}
            >
              {passwordLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Actualizar Contraseña</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
