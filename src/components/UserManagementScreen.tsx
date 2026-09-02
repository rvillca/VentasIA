import React, { useState, useEffect, useMemo } from 'react';
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
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { subscribeToUsers } from '../lib/storage';

export const UserManagementScreen: React.FC = () => {
  const {
    isJefe,
    canAdminResetPasswords,
    registerNewUserByJefe,
    adminResetUserPassword,
    updateUserAccount,
    deleteUserAccount,
    userProfile,
  } = useAuth();
  const { isDark } = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [, setLoading] = useState(true);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

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

  // Edit user modal state
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('vendedor');
  const [editDisabled, setEditDisabled] = useState(false);
  const [editComprasAccess, setEditComprasAccess] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete user modal state
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Global action notification
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((list) => {
      setUsers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'active') return !u.disabled;
      if (statusFilter === 'disabled') return !!u.disabled;
      return true;
    });
  }, [users, searchQuery, statusFilter]);

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

  // Quick direct role change (from select)
  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (!isJefe) return;
    try {
      await updateUserAccount(targetUid, { role: newRole });
      showNotice('success', `Rol actualizado a ${newRole.toUpperCase()}`);
    } catch (err: any) {
      console.error('Error updating role:', err);
      showNotice('error', err.message || 'No se pudo actualizar el rol');
    }
  };

  // Quick toggle Compras access
  const handleToggleComprasAccess = async (targetUid: string, currentVal?: boolean) => {
    if (!isJefe) return;
    try {
      await updateUserAccount(targetUid, { comprasAccess: !currentVal });
      showNotice('success', !currentVal ? 'Acceso a Compras concedido' : 'Acceso a Compras revocado');
    } catch (err: any) {
      console.error('Error toggling compras access:', err);
      showNotice('error', err.message || 'Error al modificar permisos');
    }
  };

  // Quick toggle active / deactivated status
  const handleToggleUserStatus = async (targetUser: AppUser) => {
    if (!isJefe) return;
    const isJefeAccount = targetUser.email?.toLowerCase() === 'rvillca@outlook.com' || targetUser.uid === 'jefe_rvillca';
    if (isJefeAccount) {
      showNotice('error', 'No es posible desactivar la cuenta principal del Jefe.');
      return;
    }
    if (targetUser.uid === userProfile?.uid) {
      showNotice('error', 'No puedes desactivar tu propia cuenta en sesión activa.');
      return;
    }

    const nextDisabled = !targetUser.disabled;
    try {
      await updateUserAccount(targetUser.uid, { disabled: nextDisabled });
      showNotice(
        'success',
        nextDisabled
          ? `Cuenta de ${targetUser.displayName || targetUser.email} desactivada.`
          : `Cuenta de ${targetUser.displayName || targetUser.email} reactivada.`
      );
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      showNotice('error', err.message || 'No se pudo cambiar el estado de la cuenta');
    }
  };

  // Open Edit User Modal
  const handleOpenEditModal = (targetUser: AppUser) => {
    setSelectedUserForEdit(targetUser);
    setEditDisplayName(targetUser.displayName || '');
    setEditEmail(targetUser.email || '');
    setEditRole(targetUser.role || 'vendedor');
    setEditDisabled(!!targetUser.disabled);
    setEditComprasAccess(!!targetUser.comprasAccess);
    setEditNewPassword('');
    setEditError(null);
    setEditSuccess(null);
  };

  // Save changes from Edit User Modal
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    if (!editDisplayName.trim()) {
      setEditError('Por favor ingresa un nombre válido.');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (editNewPassword.trim() && editNewPassword.trim().length < 4) {
      setEditError('La nueva contraseña debe contener al menos 4 caracteres.');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      setEditSuccess(null);

      await updateUserAccount(selectedUserForEdit.uid, {
        displayName: editDisplayName.trim(),
        email: editEmail.trim(),
        role: editRole,
        disabled: editDisabled,
        comprasAccess: editComprasAccess,
        newPassword: editNewPassword.trim() || undefined,
      });

      setEditSuccess('¡Cuenta de usuario actualizada exitosamente!');
      setTimeout(() => {
        setEditSuccess(null);
        setSelectedUserForEdit(null);
        showNotice('success', `Datos de ${editDisplayName.trim()} actualizados.`);
      }, 1200);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setEditError(err.message || 'Error al actualizar la cuenta.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (targetUser: AppUser) => {
    const isJefeAccount = targetUser.email?.toLowerCase() === 'rvillca@outlook.com' || targetUser.uid === 'jefe_rvillca';
    if (isJefeAccount) {
      showNotice('error', 'La cuenta principal del Jefe no puede ser eliminada.');
      return;
    }
    if (targetUser.uid === userProfile?.uid) {
      showNotice('error', 'No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }
    setSelectedUserForDelete(targetUser);
    setDeleteError(null);
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await deleteUserAccount(selectedUserForDelete.uid, selectedUserForDelete.email);
      const name = selectedUserForDelete.displayName || selectedUserForDelete.email;
      setSelectedUserForDelete(null);
      showNotice('success', `Cuenta de ${name} eliminada permanentemente.`);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setDeleteError(err.message || 'Error al eliminar usuario.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle password reset submit
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
      }, 1600);
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
    <div id="users-management-screen" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
              : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
          }`}
        >
          {actionNotice.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{actionNotice.text}</span>
        </div>
      )}

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
          <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Control de Personal & Cuentas</span>
        </div>
        <h1
          className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}
        >
          Gestión de Personal, Cuentas & Acceso
        </h1>
        <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
          {isJefe
            ? 'Crea, edita nombres y roles, desactiva o elimina cuentas de usuarios según la rotación de tu personal.'
            : 'Como Supervisor puedes consultar el personal y cambiar contraseñas de vendedores autorizados.'}
        </p>
      </div>

      {/* Grid: Create Form + Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create User Form (Only for Jefe) */}
        {isJefe ? (
          <div
            className={`lg:col-span-5 border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 h-fit ${
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
                <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Personal de Ventas, Compras o Supervisión</p>
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
            className={`lg:col-span-4 border rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 h-fit ${
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
              Como Supervisor tienes permiso para restablecer o cambiar la contraseña de cualquier vendedor cuando lo solicite. Haz clic en el botón <strong className={isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}>"Cambiar Clave"</strong> junto al usuario correspondiente.
            </p>
          </div>
        )}

        {/* Right Column: Existing Users List & Management */}
        <div
          className={`${isJefe ? 'lg:col-span-7' : 'lg:col-span-8'} border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          {/* Top Bar: Title and Stats */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              <div>
                <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Personal Registrado ({users.length})
                </h2>
                <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  {isJefe ? 'Editar nombres, cambiar roles, desactivar o eliminar' : 'Control de claves y supervisión'}
                </p>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  statusFilter === 'all'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5]'
                      : 'bg-[#1A2B5C] text-white border-[#1A2B5C]'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] border-[#223368] hover:text-white'
                    : 'bg-[#FBF7EF] text-[#78716C] border-[#E8DFC8] hover:text-[#1A2B5C]'
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  statusFilter === 'active'
                    ? isDark
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-emerald-700 text-white border-emerald-700'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] border-[#223368] hover:text-white'
                    : 'bg-[#FBF7EF] text-[#78716C] border-[#E8DFC8] hover:text-[#1A2B5C]'
                }`}
              >
                Activos ({users.filter((u) => !u.disabled).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                  statusFilter === 'disabled'
                    ? isDark
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-rose-700 text-white border-rose-700'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] border-[#223368] hover:text-white'
                    : 'bg-[#FBF7EF] text-[#78716C] border-[#E8DFC8] hover:text-[#1A2B5C]'
                }`}
              >
                Inactivos ({users.filter((u) => u.disabled).length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none transition ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold p-1 ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Users List Cards */}
          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div
                className={`py-8 text-center border rounded-2xl ${
                  isDark ? 'bg-[#0F1B3C]/50 border-[#223368]' : 'bg-[#FBF7EF]/50 border-[#E8DFC8]'
                }`}
              >
                <Users className={`w-8 h-8 mx-auto mb-2 opacity-40 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`} />
                <p className={`text-xs font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  {searchQuery ? 'No se encontraron usuarios con ese término.' : 'No hay usuarios en esta categoría.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isCurrent = u.uid === userProfile?.uid;
                const isJefeAccount = u.email?.toLowerCase() === 'rvillca@outlook.com' || u.uid === 'jefe_rvillca';
                const isDisabled = !!u.disabled;

                return (
                  <div
                    key={u.uid}
                    className={`p-3.5 border rounded-2xl transition-all space-y-2.5 ${
                      isDisabled
                        ? isDark
                          ? 'bg-[#0F1B3C]/60 border-rose-950/60 opacity-80'
                          : 'bg-[#F5EFE0]/60 border-rose-200 opacity-80'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] hover:border-[#FF6FA5]/40'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] hover:border-[#1A2B5C]/30'
                    }`}
                  >
                    {/* User Info Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Role Icon Avatar */}
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                              isJefeAccount || u.role === 'jefe'
                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                                : u.role === 'supervisor'
                                ? 'bg-blue-500/20 border-blue-500/30 text-blue-500'
                                : u.role === 'comprador'
                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-600'
                                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                            }`}
                          >
                            {isJefeAccount || u.role === 'jefe' ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : u.role === 'supervisor' ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : u.role === 'comprador' ? (
                              <ShoppingBag className="w-3.5 h-3.5" />
                            ) : (
                              <Briefcase className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Display Name */}
                          <span
                            className={`text-sm font-bold tracking-tight ${
                              isDisabled
                                ? 'line-through text-rose-500/80 dark:text-rose-400/80'
                                : isDark
                                ? 'text-white'
                                : 'text-[#1A2B5C]'
                            }`}
                          >
                            {u.displayName || 'Usuario sin nombre'}
                          </span>

                          {/* Badges */}
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

                          {/* Active / Disabled Status Badge */}
                          {isDisabled ? (
                            <span className="text-[9px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Desactivado
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Activo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>{u.email}</span>
                          {u.comprasAccess && u.role === 'vendedor' && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                              + Compras
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Role Selector (Only for Jefe) */}
                      {isJefe ? (
                        <select
                          value={u.role || 'vendedor'}
                          disabled={isJefeAccount}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none transition shrink-0 ${
                            isDark
                              ? 'bg-[#16234F] text-white border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          } ${isJefeAccount ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isJefeAccount ? 'La cuenta del Jefe siempre mantiene su rol' : 'Cambiar rol rápidamente'}
                        >
                          <option value="jefe">👑 Jefe / Admin</option>
                          <option value="supervisor">📊 Supervisor</option>
                          <option value="comprador">🛒 Comprador</option>
                          <option value="vendedor">💼 Vendedor</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[11px] font-bold rounded-xl px-2 py-1 border shrink-0 ${
                            isDark
                              ? 'bg-[#16234F] text-white border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons Bar */}
                    <div
                      className={`flex items-center justify-between pt-2 border-t flex-wrap gap-2 ${
                        isDark ? 'border-[#223368]/60' : 'border-[#E8DFC8]'
                      }`}
                    >
                      {/* Left sub-actions: Compras toggle if vendedor */}
                      <div className="flex items-center gap-1.5">
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
                            <span>{u.comprasAccess ? '✓ Con Compras' : '+ Habilitar Compras'}</span>
                          </button>
                        )}
                      </div>

                      {/* Right Action buttons: Edit, Toggle Status, Password, Delete */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. Edit User Button (Only Jefe) */}
                        {isJefe && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className={`px-2.5 py-1 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                              isDark
                                ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                                : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
                            }`}
                            title="Editar nombre, correo, rol o datos de esta cuenta"
                          >
                            <Pencil className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                            <span>Editar</span>
                          </button>
                        )}

                        {/* 2. Deactivate / Activate Button (Only Jefe) */}
                        {isJefe && (
                          <button
                            type="button"
                            disabled={isJefeAccount || isCurrent}
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isDisabled
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}
                            title={
                              isJefeAccount
                                ? 'La cuenta principal no puede ser desactivada'
                                : isCurrent
                                ? 'No puedes desactivar tu propia cuenta activa'
                                : isDisabled
                                ? 'Reactivar acceso al sistema para este usuario'
                                : 'Desactivar y bloquear el acceso al sistema de este usuario'
                            }
                          >
                            {isDisabled ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivar</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Desactivar</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 3. Reset Password Button (Jefe & Supervisor) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setResetNewPass('');
                            setResetError(null);
                            setResetSuccess(null);
                          }}
                          className={`px-2.5 py-1 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                            isDark
                              ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                              : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
                          }`}
                          title="Cambiar contraseña de este usuario"
                        >
                          <KeyRound className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                          <span>Clave</span>
                        </button>

                        {/* 4. Delete User Button (Only Jefe) */}
                        {isJefe && (
                          <button
                            type="button"
                            disabled={isJefeAccount || isCurrent}
                            onClick={() => handleOpenDeleteModal(u)}
                            className={`p-1.5 border text-xs font-bold rounded-xl flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                              isDark
                                ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-900/60 text-rose-400'
                                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                            }`}
                            title={
                              isJefeAccount
                                ? 'La cuenta del Jefe no puede ser eliminada'
                                : isCurrent
                                ? 'No puedes eliminar tu propia cuenta en sesión'
                                : 'Eliminar permanentemente esta cuenta de usuario'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Modal 1: Edit User Account (Only Jefe)                   */}
      {/* ========================================================= */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Editar Cuenta de Usuario
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    ID: <span className="font-mono">{selectedUserForEdit.uid}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            {editSuccess && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            {editError && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              {/* Field: Display Name */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Nombre Completo
                </label>
                <div className="relative">
                  <User
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="ej: Paola Vargas"
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              {/* Field: Email */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Correo Electrónico (Login)
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="ej: paola@tienda.com"
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              {/* Field: Role */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Rol / Nivel de Acceso
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('vendedor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      editRole === 'vendedor'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Vendedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole('comprador')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      editRole === 'comprador'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Comprador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole('supervisor')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      editRole === 'supervisor'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-blue-500 text-blue-300 shadow-sm'
                          : 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Supervisor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole('jefe')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                      editRole === 'jefe'
                        ? isDark
                          ? 'bg-[#0F1B3C] border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>👑 Jefe</span>
                  </button>
                </div>
              </div>

              {/* Field: Account Status (Active vs Disabled) */}
              <div
                className={`p-3.5 border rounded-2xl space-y-2 ${
                  isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                      Estado de la Cuenta
                    </span>
                    <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      {editDisabled
                        ? '🔴 Cuenta DESACTIVADA (El usuario no puede ingresar)'
                        : '🟢 Cuenta ACTIVA (Permite el acceso normalmente)'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={selectedUserForEdit.email?.toLowerCase() === 'rvillca@outlook.com'}
                    onClick={() => setEditDisabled(!editDisabled)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      editDisabled
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-500 dark:text-rose-400'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {editDisabled ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>{editDisabled ? 'Desactivada' : 'Activa'}</span>
                  </button>
                </div>

                {selectedUserForEdit.email?.toLowerCase() === 'rvillca@outlook.com' && (
                  <p className="text-[10px] text-amber-500 font-medium">
                    * La cuenta principal del Jefe siempre permanece activa.
                  </p>
                )}
              </div>

              {/* Field: Extra Compras permission (for vendedor role) */}
              {editRole === 'vendedor' && (
                <div
                  className={`p-3.5 border rounded-2xl flex items-center justify-between ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div>
                    <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                      Acceso al Módulo de Compras
                    </span>
                    <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      Permitir registrar compras y recepción de mercadería
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditComprasAccess(!editComprasAccess)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      editComprasAccess
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400'
                        : isDark
                        ? 'bg-[#16234F] border-[#223368] text-[#9AA6C9]'
                        : 'bg-white border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    {editComprasAccess ? '✓ Habilitado' : '✕ Bloqueado'}
                  </button>
                </div>
              )}

              {/* Field: Optional New Password */}
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Asignar Nueva Contraseña (Opcional)
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Dejar vacío para conservar la contraseña actual"
                    className={`w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none transition ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]/80'}`}>
                  Ingresa un valor únicamente si deseas renovar o restablecer la clave en este momento.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className={`flex-1 py-3 px-3 rounded-xl border font-bold text-xs sm:text-sm transition cursor-pointer ${
                    isDark
                      ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                      : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                      : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                  }`}
                >
                  {editLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal 2: Delete User Confirmation (Only Jefe)            */}
      {/* ========================================================= */}
      {selectedUserForDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 ${
              isDark ? 'bg-[#16234F] border-rose-500/40' : 'bg-white border-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black font-['Outfit',sans-serif] text-rose-600 dark:text-rose-400">
                  ¿Eliminar Cuenta de Usuario?
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Esta acción es irreversible y removerá el acceso al sistema.
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
                  isDark
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Target Account Summary Card */}
            <div
              className={`p-3.5 border rounded-2xl space-y-1.5 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {selectedUserForDelete.displayName || 'Usuario'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 uppercase">
                  {selectedUserForDelete.role || 'vendedor'}
                </span>
              </div>
              <p className={`text-xs font-mono ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                {selectedUserForDelete.email}
              </p>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              El usuario ya no podrá iniciar sesión en la aplicación. Las ventas y compras previamente registradas por este usuario se mantendrán en el historial del sistema con su nombre.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setSelectedUserForDelete(null)}
                className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs sm:text-sm transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Cuenta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal 3: Reset Password (Jefe & Supervisor)              */}
      {/* ========================================================= */}
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
                type="button"
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
