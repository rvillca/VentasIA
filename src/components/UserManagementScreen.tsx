import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Eye,
  ShoppingBag,
  Check,
  AlertCircle,
  KeyRound,
  Lock,
  Mail,
  User,
  X,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { subscribeToUsers, updateUserInFirestore } from '../lib/storage';

export const UserManagementScreen: React.FC = () => {
  const { isJefe, isSupervisor, canAdminResetPasswords, registerNewUserByJefe, adminResetUserPassword, userProfile } = useAuth();
  const { isDark } = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state (Only for Jefe)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('vendedor');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password reset modal state
  const [selectedUserForReset, setSelectedUserForReset] = useState<AppUser | null>(null);
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((list) => {
      setUsers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJefe) {
      setErrorMsg('Solo el Jefe / Administrador tiene permisos para crear usuarios.');
      return;
    }

    if (!email.trim() || !password || !displayName.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await registerNewUserByJefe(email, password, displayName, role);

      setSuccessMsg(`¡Cuenta creada con éxito para ${displayName} con rol de ${role.toUpperCase()}!`);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('vendedor');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error creating user:', err);
      setErrorMsg(err.message || 'Error al crear la cuenta de usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (!isJefe) return;
    try {
      await updateUserInFirestore(targetUid, { role: newRole });
    } catch (err: any) {
      console.error('Error updating role:', err);
    }
  };

  const handleToggleComprasAccess = async (targetUid: string, currentVal?: boolean) => {
    if (!isJefe) return;
    try {
      await updateUserInFirestore(targetUid, { comprasAccess: !currentVal });
    } catch (err: any) {
      console.error('Error toggling compras access:', err);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    if (!resetNewPass || resetNewPass.length < 4) {
      setResetError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    try {
      setResetLoading(true);
      setResetError(null);
      await adminResetUserPassword(selectedUserForReset.email, resetNewPass);
      setResetSuccess(`Contraseña cambiada exitosamente para ${selectedUserForReset.displayName || selectedUserForReset.email}`);
      setResetNewPass('');
      setTimeout(() => {
        setResetSuccess(null);
        setSelectedUserForReset(null);
      }, 1800);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setResetError(err.message || 'Error al cambiar contraseña.');
    } finally {
      setResetLoading(false);
    }
  };

  if (!canAdminResetPasswords) {
    return (
      <div
        className={`max-w-xl mx-auto p-8 text-center border rounded-3xl mt-8 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>Acceso Restringido</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
          Solo el Jefe y el Supervisor pueden acceder a la gestión y restablecimiento de claves del equipo.
        </p>
      </div>
    );
  }

  return (
    <div id="users-management-screen" className="max-w-5xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isDark
                ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
            }`}
          >
            {isJefe ? '👑 Panel de Administración del Jefe' : '📊 Panel de Supervisor'}
          </span>
          <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Control de Personal & Claves</span>
        </div>
        <h1
          className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}
        >
          Gestión de Cuentas, Personal & Contraseñas
        </h1>
        <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
          {isJefe
            ? 'Crea cuentas para tu equipo, asigna roles y cambia contraseñas si un vendedor lo olvida.'
            : 'Como Supervisor puedes consultar el personal y cambiar contraseñas de vendedores autorizados.'}
        </p>
      </div>

      {/* Grid: Create Form + Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create User Form (Only for Jefe) */}
        {isJefe ? (
          <div
            className={`lg:col-span-5 border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div
              className={`flex items-center gap-2.5 border-b pb-3 ${
                isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              >
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Registrar Nuevo Usuario
                </h2>
                <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Vendedor o Supervisor</p>
              </div>
            </div>

            {successMsg && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Nombre Completo
                </label>
                <div className="relative">
                  <User
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ej: Paola Vargas"
                    className={`w-full border rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Correo Electrónico (Login)
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor1@tienda.com"
                    className={`w-full border rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Contraseña Inicial
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className={`w-full border rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Rol / Nivel de Acceso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('vendedor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      role === 'vendedor'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Vendedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('comprador')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      role === 'comprador'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Comprador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('supervisor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      role === 'supervisor'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-blue-500 text-blue-300 shadow-sm'
                          : 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Supervisor</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-95 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                    : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                }`}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Cuenta de Usuario</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div
            className={`lg:col-span-4 border rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>Gestión de Claves de Personal</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Como Supervisor tienes permiso para restablecer o cambiar la contraseña de cualquier vendedor cuando lo solicite. Haz clic en el botón <strong className={isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}>"Cambiar Clave"</strong> junto a su usuario.
            </p>
          </div>
        )}

        {/* Right Column: Existing Users List & Password Management */}
        <div
          className={`${isJefe ? 'lg:col-span-7' : 'lg:col-span-8'} border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Personal Registrado ({users.length})
              </h2>
            </div>
            <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Control de Claves & Roles</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {users.length === 0 ? (
              <p className={`text-xs py-6 text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Aún no hay usuarios secundarios creados.
              </p>
            ) : (
              users.map((u) => {
                const isCurrent = u.uid === userProfile?.uid;
                const isJefeAccount = u.email?.toLowerCase() === 'rvillca@outlook.com';

                return (
                  <div
                    key={u.uid}
                    className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                          {u.displayName || 'Usuario'}
                        </span>
                        {isCurrent && (
                          <span
                            className={`text-[9px] border px-1.5 py-0.5 rounded-full font-bold ${
                              isDark
                                ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                                : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
                            }`}
                          >
                            Tú
                          </span>
                        )}
                        {isJefeAccount && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            👑 Jefe
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Role selection (Only Jefe can change roles) */}
                      {isJefe ? (
                        <select
                          value={u.role || 'vendedor'}
                          disabled={isJefeAccount}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none transition ${
                            isDark
                              ? 'bg-[#16234F] text-white border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          <option value="jefe">👑 Jefe / Admin</option>
                          <option value="supervisor">📊 Supervisor (Ventas & Compras)</option>
                          <option value="comprador">🛒 Comprador (Solo Compras)</option>
                          <option value="vendedor">💼 Vendedor (Ventas)</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[11px] font-bold rounded-xl px-2 py-1 border ${
                            isDark
                              ? 'bg-[#16234F] text-white border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      )}

                      {/* Extra Compras permission button for Vendedor (Jefe can toggle) */}
                      {isJefe && u.role === 'vendedor' && (
                        <button
                          type="button"
                          onClick={() => handleToggleComprasAccess(u.uid, u.comprasAccess)}
                          className={`text-[10px] font-bold rounded-xl px-2 py-1 border transition flex items-center gap-1 cursor-pointer ${
                            u.comprasAccess
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                              : isDark
                              ? 'bg-[#16234F] text-[#9AA6C9] border-[#223368] hover:text-white'
                              : 'bg-white text-[#78716C] border-[#E8DFC8] hover:text-[#1A2B5C]'
                          }`}
                          title="Permitir o denegar que este vendedor registre compras de material"
                        >
                          <span>{u.comprasAccess ? '✓ Acceso Compras' : '+ Dar Compras'}</span>
                        </button>
                      )}

                      {/* Reset password button (Jefe & Supervisor) */}
                      <button
                        onClick={() => {
                          setSelectedUserForReset(u);
                          setResetNewPass('');
                          setResetError(null);
                          setResetSuccess(null);
                        }}
                        className={`px-2.5 py-1.5 border text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                          isDark
                            ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                            : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
                        }`}
                        title="Cambiar contraseña de este usuario"
                      >
                        <KeyRound className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                        <span>Cambiar Clave</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal for Resetting a User's Password by Jefe / Supervisor */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>Cambiar Contraseña</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Para: <strong className={isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}>{selectedUserForReset.displayName || selectedUserForReset.email}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetError && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Nueva Contraseña para el Usuario
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="password"
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className={`w-full border rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                    isDark
                      ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                      : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                      : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                  }`}
                >
                  {resetLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Actualizar Clave</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
