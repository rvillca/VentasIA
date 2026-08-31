import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
      <div className="max-w-xl mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl mt-8">
        <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
        <p className="text-sm text-slate-400 mt-1">
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
          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full">
            {isJefe ? '👑 Panel de Administración del Jefe' : '📊 Panel de Supervisor'}
          </span>
          <span className="text-xs text-slate-400">Control de Personal & Claves</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
          Gestión de Cuentas, Personal & Contraseñas
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          {isJefe
            ? 'Crea cuentas para tu equipo, asigna roles y cambia contraseñas si un vendedor lo olvida.'
            : 'Como Supervisor puedes consultar el personal y cambiar contraseñas de vendedores autorizados.'}
        </p>
      </div>

      {/* Grid: Create Form + Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create User Form (Only for Jefe) */}
        {isJefe ? (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  Registrar Nuevo Usuario
                </h2>
                <p className="text-[11px] text-slate-400">Vendedor o Supervisor</p>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ej: Paola Vargas"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correo Electrónico (Login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor1@tienda.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Contraseña Inicial
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Rol / Nivel de Acceso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('vendedor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      role === 'vendedor'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Vendedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('comprador')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      role === 'comprador'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Comprador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('supervisor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      role === 'supervisor'
                        ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
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
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 active:scale-95 shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center text-blue-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Gestión de Claves de Personal</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Como Supervisor tienes permiso para restablecer o cambiar la contraseña de cualquier vendedor cuando lo solicite. Haz clic en el botón <strong className="text-purple-300">"Cambiar Clave"</strong> junto a su usuario.
            </p>
          </div>
        )}

        {/* Right Column: Existing Users List & Password Management */}
        <div className={`${isJefe ? 'lg:col-span-7' : 'lg:col-span-8'} bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                Personal Registrado ({users.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">Control de Claves & Roles</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {users.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Aún no hay usuarios secundarios creados.
              </p>
            ) : (
              users.map((u) => {
                const isCurrent = u.uid === userProfile?.uid;
                const isJefeAccount = u.email?.toLowerCase() === 'rvillca@outlook.com';

                return (
                  <div
                    key={u.uid}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {u.displayName || 'Usuario'}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-full font-bold">
                            Tú
                          </span>
                        )}
                        {isJefeAccount && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded-full font-bold">
                            👑 Jefe
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Role selection (Only Jefe can change roles) */}
                      {isJefe ? (
                        <select
                          value={u.role || 'vendedor'}
                          disabled={isJefeAccount}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none transition ${
                            u.role === 'jefe'
                              ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                              : u.role === 'supervisor'
                              ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                              : u.role === 'comprador'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          <option value="jefe">👑 Jefe / Admin</option>
                          <option value="supervisor">📊 Supervisor (Ventas & Compras)</option>
                          <option value="comprador">🛒 Comprador (Solo Compras)</option>
                          <option value="vendedor">💼 Vendedor (Ventas)</option>
                        </select>
                      ) : (
                        <span className={`text-[11px] font-bold rounded-xl px-2 py-1 border ${
                          u.role === 'jefe'
                            ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                            : u.role === 'supervisor'
                            ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                            : u.role === 'comprador'
                            ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {u.role?.toUpperCase()}
                        </span>
                      )}

                      {/* Extra Compras permission button for Vendedor (Jefe can toggle) */}
                      {isJefe && u.role === 'vendedor' && (
                        <button
                          type="button"
                          onClick={() => handleToggleComprasAccess(u.uid, u.comprasAccess)}
                          className={`text-[10px] font-bold rounded-xl px-2 py-1 border transition flex items-center gap-1 ${
                            u.comprasAccess
                              ? 'bg-amber-950 text-amber-300 border-amber-500/50 hover:bg-amber-900'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
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
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-purple-950 hover:border-purple-500/40 border border-slate-700 text-slate-300 hover:text-purple-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                        title="Cambiar contraseña de este usuario"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-purple-400" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-400">
                    Para: <strong className="text-cyan-300">{selectedUserForReset.displayName || selectedUserForReset.email}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nueva Contraseña para el Usuario
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {resetLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
