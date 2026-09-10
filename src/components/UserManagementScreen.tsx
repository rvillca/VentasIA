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
  Database,
  ShieldCheck,
  Smartphone,
  Clock,
  ShieldAlert,
  RefreshCw,
  Sliders,
  Sparkles,
  Fingerprint,
  Laptop,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { subscribeToUsers } from '../lib/storage';
import { DatabaseMaintenanceScreen } from './DatabaseMaintenanceScreen';

export const UserManagementScreen: React.FC = () => {
  const {
    isJefe,
    canAdminResetPasswords,
    registerNewUserByJefe,
    adminResetUserPassword,
    updateUserAccount,
    deleteUserAccount,
    adminResetUserTwoFactor,
    adminToggleForceTwoFactor,
    adminDisableUserTwoFactor,
    adminSetAllUsersTwoFactorRequired,
    adminToggleForceWebAuthn,
    adminResetUserWebAuthn,
    adminDeleteUserWebAuthnCredential,
    adminSetAllUsersWebAuthnRequired,
    userProfile,
  } = useAuth();
  const { isDark } = useTheme();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [, setLoading] = useState(true);

  // Sub-tabs for Admin/Jefe: Personal vs Mantenimiento BD
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'maintenance'>('users');

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

  // Disable 2FA modal state
  const [confirmDisable2FAUser, setConfirmDisable2FAUser] = useState<AppUser | null>(null);
  const [disable2FALoading, setDisable2FALoading] = useState(false);

  // Dedicated MFA / 2FA Management Modal State (for Jefe)
  const [selectedUserForMfa, setSelectedUserForMfa] = useState<AppUser | null>(null);
  const [mfaActionLoading, setMfaActionLoading] = useState(false);
  const [mfaActionSuccess, setMfaActionSuccess] = useState<string | null>(null);
  const [mfaActionError, setMfaActionError] = useState<string | null>(null);

  // Global MFA Policy Modal State
  const [showGlobalMfaModal, setShowGlobalMfaModal] = useState(false);
  const [globalMfaLoading, setGlobalMfaLoading] = useState(false);

  // Dedicated WebAuthn / Huella Digital Management Modal State (for Jefe)
  const [selectedUserForWebAuthn, setSelectedUserForWebAuthn] = useState<AppUser | null>(null);
  const [webAuthnActionLoading, setWebAuthnActionLoading] = useState(false);
  const [webAuthnActionSuccess, setWebAuthnActionSuccess] = useState<string | null>(null);
  const [webAuthnActionError, setWebAuthnActionError] = useState<string | null>(null);

  // Global WebAuthn Policy Modal State
  const [showGlobalWebAuthnModal, setShowGlobalWebAuthnModal] = useState(false);
  const [globalWebAuthnLoading, setGlobalWebAuthnLoading] = useState(false);

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

  // Handle Jefe disabling 2FA for a user (e.g. lost device)
  const handleConfirmDisable2FA = async () => {
    if (!confirmDisable2FAUser) return;
    try {
      setDisable2FALoading(true);
      await adminDisableUserTwoFactor(confirmDisable2FAUser.uid);
      const name = confirmDisable2FAUser.displayName || confirmDisable2FAUser.email;
      showNotice('success', `Doble Factor (2FA) desactivado para ${name}.`);
      setConfirmDisable2FAUser(null);
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      showNotice('error', err.message || 'No se pudo desactivar el 2FA.');
    } finally {
      setDisable2FALoading(false);
    }
  };

  // Open MFA Management Modal
  const handleOpenMfaModal = (targetUser: AppUser) => {
    setSelectedUserForMfa(targetUser);
    setMfaActionError(null);
    setMfaActionSuccess(null);
  };

  // 1. Reset 2FA for lost phone + Force re-enrollment on next login
  const handleResetMfaAndForce = async () => {
    if (!selectedUserForMfa) return;
    try {
      setMfaActionLoading(true);
      setMfaActionError(null);
      await adminResetUserTwoFactor(selectedUserForMfa.uid, true);
      const name = selectedUserForMfa.displayName || selectedUserForMfa.email;
      setMfaActionSuccess(`¡2FA reseteado! Se exigirá a ${name} escanear un nuevo código QR en su próximo inicio de sesión.`);
      showNotice('success', `2FA reseteado con vinculación obligatoria para ${name}.`);
      setSelectedUserForMfa((prev) => prev ? { ...prev, twoFactorEnabled: false, twoFactorSecret: '', twoFactorRequired: true } : null);
    } catch (err: any) {
      console.error('Error resetting 2FA:', err);
      setMfaActionError(err.message || 'No se pudo resetear el 2FA');
    } finally {
      setMfaActionLoading(false);
    }
  };

  // 1b. Reset 2FA for lost phone + make optional
  const handleResetMfaOptional = async () => {
    if (!selectedUserForMfa) return;
    try {
      setMfaActionLoading(true);
      setMfaActionError(null);
      await adminResetUserTwoFactor(selectedUserForMfa.uid, false);
      const name = selectedUserForMfa.displayName || selectedUserForMfa.email;
      setMfaActionSuccess(`¡2FA reseteado! El acceso con 2FA es ahora opcional para ${name}.`);
      showNotice('success', `2FA reseteado a modo opcional para ${name}.`);
      setSelectedUserForMfa((prev) => prev ? { ...prev, twoFactorEnabled: false, twoFactorSecret: '', twoFactorRequired: false } : null);
    } catch (err: any) {
      console.error('Error resetting 2FA:', err);
      setMfaActionError(err.message || 'No se pudo resetear el 2FA');
    } finally {
      setMfaActionLoading(false);
    }
  };

  // 2. Toggle forcing 2FA for user
  const handleToggleUserMfaRequired = async (required: boolean) => {
    if (!selectedUserForMfa) return;
    try {
      setMfaActionLoading(true);
      setMfaActionError(null);
      await adminToggleForceTwoFactor(selectedUserForMfa.uid, required);
      const name = selectedUserForMfa.displayName || selectedUserForMfa.email;
      setMfaActionSuccess(
        required
          ? `¡2FA marcado como OBLIGATORIO para ${name}! Deberá configurar su app autenticadora.`
          : `2FA configurado como OPCIONAL para ${name}.`
      );
      showNotice(
        'success',
        required ? `2FA ahora es OBLIGATORIO para ${name}.` : `2FA ahora es OPCIONAL para ${name}.`
      );
      setSelectedUserForMfa((prev) => prev ? { ...prev, twoFactorRequired: required } : null);
    } catch (err: any) {
      console.error('Error toggling force 2FA:', err);
      setMfaActionError(err.message || 'No se pudo cambiar la obligatoriedad de 2FA');
    } finally {
      setMfaActionLoading(false);
    }
  };

  // 3. Disable 2FA completely
  const handleDisableMfaTotal = async () => {
    if (!selectedUserForMfa) return;
    try {
      setMfaActionLoading(true);
      setMfaActionError(null);
      await adminDisableUserTwoFactor(selectedUserForMfa.uid);
      const name = selectedUserForMfa.displayName || selectedUserForMfa.email;
      setMfaActionSuccess(`2FA desactivado totalmente para ${name}.`);
      showNotice('success', `2FA desactivado totalmente para ${name}.`);
      setSelectedUserForMfa((prev) => prev ? { ...prev, twoFactorEnabled: false, twoFactorSecret: '', twoFactorRequired: false } : null);
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      setMfaActionError(err.message || 'No se pudo desactivar el 2FA');
    } finally {
      setMfaActionLoading(false);
    }
  };

  // 4. Set global policy for all users
  const handleSetGlobalMfaPolicy = async (required: boolean) => {
    try {
      setGlobalMfaLoading(true);
      await adminSetAllUsersTwoFactorRequired(required);
      showNotice(
        'success',
        required
          ? '¡Política aplicada! 2FA es ahora OBLIGATORIO para todo el personal.'
          : 'Política actualizada: 2FA es ahora OPCIONAL para todo el personal.'
      );
      setShowGlobalMfaModal(false);
    } catch (err: any) {
      console.error('Error applying global 2FA policy:', err);
      showNotice('error', err.message || 'No se pudo aplicar la política global.');
    } finally {
      setGlobalMfaLoading(false);
    }
  };

  const handleOpenWebAuthnModal = (u: AppUser) => {
    setSelectedUserForWebAuthn(u);
    setWebAuthnActionError(null);
    setWebAuthnActionSuccess(null);
  };

  // 1a. Reset WebAuthn credentials + force re-enrollment on next login
  const handleResetWebAuthnForce = async () => {
    if (!selectedUserForWebAuthn) return;
    try {
      setWebAuthnActionLoading(true);
      setWebAuthnActionError(null);
      await adminResetUserWebAuthn(selectedUserForWebAuthn.uid, true);
      const name = selectedUserForWebAuthn.displayName || selectedUserForWebAuthn.email;
      setWebAuthnActionSuccess(`¡Dispositivos biométricos reseteados! ${name} deberá registrar su huella al iniciar sesión.`);
      showNotice('success', `Dispositivos biométricos reseteados para ${name}.`);
      setSelectedUserForWebAuthn((prev) =>
        prev
          ? {
              ...prev,
              webAuthnEnabled: false,
              webAuthnCredentials: [],
              webAuthnRequired: true,
            }
          : null
      );
    } catch (err: any) {
      console.error('Error resetting WebAuthn:', err);
      setWebAuthnActionError(err.message || 'No se pudo resetear la huella digital');
    } finally {
      setWebAuthnActionLoading(false);
    }
  };

  // 1b. Reset WebAuthn + make optional
  const handleResetWebAuthnOptional = async () => {
    if (!selectedUserForWebAuthn) return;
    try {
      setWebAuthnActionLoading(true);
      setWebAuthnActionError(null);
      await adminResetUserWebAuthn(selectedUserForWebAuthn.uid, false);
      const name = selectedUserForWebAuthn.displayName || selectedUserForWebAuthn.email;
      setWebAuthnActionSuccess(`¡Huella digital desactivada! El acceso biométrico es ahora opcional para ${name}.`);
      showNotice('success', `Huella digital reseteada a modo opcional para ${name}.`);
      setSelectedUserForWebAuthn((prev) =>
        prev
          ? {
              ...prev,
              webAuthnEnabled: false,
              webAuthnCredentials: [],
              webAuthnRequired: false,
            }
          : null
      );
    } catch (err: any) {
      console.error('Error resetting WebAuthn:', err);
      setWebAuthnActionError(err.message || 'No se pudo resetear la huella digital');
    } finally {
      setWebAuthnActionLoading(false);
    }
  };

  // 2. Toggle forcing WebAuthn for user
  const handleToggleUserWebAuthnRequired = async (required: boolean) => {
    if (!selectedUserForWebAuthn) return;
    try {
      setWebAuthnActionLoading(true);
      setWebAuthnActionError(null);
      await adminToggleForceWebAuthn(selectedUserForWebAuthn.uid, required);
      const name = selectedUserForWebAuthn.displayName || selectedUserForWebAuthn.email;
      setWebAuthnActionSuccess(
        required
          ? `¡Huella digital marcada como OBLIGATORIA para ${name}! Se le exigirá al iniciar sesión.`
          : `Huella digital configurada como OPCIONAL para ${name}.`
      );
      showNotice(
        'success',
        required ? `Huella ahora es OBLIGATORIA para ${name}.` : `Huella ahora es OPCIONAL para ${name}.`
      );
      setSelectedUserForWebAuthn((prev) => (prev ? { ...prev, webAuthnRequired: required } : null));
    } catch (err: any) {
      console.error('Error toggling force WebAuthn:', err);
      setWebAuthnActionError(err.message || 'No se pudo cambiar la obligatoriedad de la huella');
    } finally {
      setWebAuthnActionLoading(false);
    }
  };

  // 3. Delete specific credential from user
  const handleDeleteUserWebAuthnCredential = async (credentialId: string) => {
    if (!selectedUserForWebAuthn) return;
    try {
      setWebAuthnActionLoading(true);
      setWebAuthnActionError(null);
      await adminDeleteUserWebAuthnCredential(selectedUserForWebAuthn.uid, credentialId);
      const updatedCreds = (selectedUserForWebAuthn.webAuthnCredentials || []).filter(
        (c) => c.id !== credentialId
      );
      setWebAuthnActionSuccess('Dispositivo biométrico revocado exitosamente.');
      showNotice('success', 'Dispositivo biométrico revocado.');
      setSelectedUserForWebAuthn((prev) =>
        prev
          ? {
              ...prev,
              webAuthnCredentials: updatedCreds,
              webAuthnEnabled: updatedCreds.length > 0,
            }
          : null
      );
    } catch (err: any) {
      console.error('Error deleting credential:', err);
      setWebAuthnActionError(err.message || 'No se pudo revocar el dispositivo biométrico');
    } finally {
      setWebAuthnActionLoading(false);
    }
  };

  // 4. Set global WebAuthn policy for all users
  const handleSetGlobalWebAuthnPolicy = async (required: boolean) => {
    try {
      setGlobalWebAuthnLoading(true);
      await adminSetAllUsersWebAuthnRequired(required);
      showNotice(
        'success',
        required
          ? '¡Política aplicada! Huella Digital es ahora OBLIGATORIA para todo el personal.'
          : 'Política actualizada: Huella Digital es ahora OPCIONAL para todo el personal.'
      );
      setShowGlobalWebAuthnModal(false);
    } catch (err: any) {
      console.error('Error applying global WebAuthn policy:', err);
      showNotice('error', err.message || 'No se pudo aplicar la política global.');
    } finally {
      setGlobalWebAuthnLoading(false);
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

      {/* Sub-navigation for Jefe: Personal vs Mantenimiento BD */}
      {isJefe && (
        <div
          className={`flex items-center gap-2 p-1.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'users'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-md shadow-[#FF6FA5]/20'
                  : 'bg-[#1A2B5C] text-white shadow-md'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personal & Cuentas de Acceso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('maintenance')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeSubTab === 'maintenance'
                ? isDark
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                  : 'bg-amber-500 text-white font-bold shadow-md'
                : isDark
                ? 'text-amber-400 hover:text-white hover:bg-[#0F1B3C]'
                : 'text-amber-700 hover:text-amber-900 hover:bg-[#FBF7EF]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Mantenimiento de Base de Datos</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-black/15">
              Admin
            </span>
          </button>
        </div>
      )}

      {/* Render Maintenance Screen if active */}
      {isJefe && activeSubTab === 'maintenance' ? (
        <DatabaseMaintenanceScreen />
      ) : (
        <>
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

          {/* Global Security Policies (2FA & Biometrics) for Admin */}
          {canAdminResetPasswords && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Card 1: 2FA */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#0F1B3C]/90 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                        Doble Factor (2FA / TOTP)
                      </span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                        {users.filter((u) => u.twoFactorEnabled).length} de {users.length}
                      </span>
                      {users.filter((u) => u.twoFactorRequired).length > 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          ⚡ {users.filter((u) => u.twoFactorRequired).length} obligatorios
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      Exigir o resetear códigos de 6 dígitos.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGlobalMfaModal(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-200'
                      : 'bg-white hover:bg-purple-100 border-purple-300 text-purple-900 shadow-sm'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Política 2FA</span>
                </button>
              </div>

              {/* Card 2: Huella Digital (WebAuthn) */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#0F1B3C]/90 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                        Huella Digital (Biometría)
                      </span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                        {users.filter((u) => u.webAuthnEnabled).length} activos
                      </span>
                      {users.filter((u) => u.webAuthnRequired).length > 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                          ⚡ {users.filter((u) => u.webAuthnRequired).length} obligatorios
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      Exigir huella obligatoria o resetear sensores.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGlobalWebAuthnModal(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-200'
                      : 'bg-white hover:bg-blue-100 border-blue-300 text-blue-900 shadow-sm'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Política Huella</span>
                </button>
              </div>
            </div>
          )}

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

                          {/* 2FA Security Badge */}
                          {u.twoFactorEnabled ? (
                            <span
                              className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                              title={`2FA Activo con app autenticadora (TOTP)${u.twoFactorCreatedAt ? ` desde ${new Date(u.twoFactorCreatedAt).toLocaleDateString()}` : ''}`}
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              2FA Activo
                            </span>
                          ) : u.twoFactorRequired ? (
                            <span
                              className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                              title="2FA Obligatorio: Pendiente de vinculación con app autenticadora al iniciar sesión"
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-500" />
                              2FA Obligatorio (Pendiente)
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] opacity-60 px-1.5 py-0.5 rounded-full border border-dashed ${
                                isDark ? 'border-[#223368] text-[#9AA6C9]' : 'border-[#E8DFC8] text-[#78716C]'
                              }`}
                              title="El usuario no ha activado el Doble Factor todavía (Opcional)"
                            >
                              Sin 2FA
                            </span>
                          )}

                          {u.twoFactorRequired && u.twoFactorEnabled && (
                            <span
                              className="text-[9px] bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-bold"
                              title="2FA Exigido por el Administrador"
                            >
                              ⚡ Obligatorio
                            </span>
                          )}

                          {/* Huella Digital (Biometría) Badge */}
                          {u.webAuthnEnabled ? (
                            <span
                              className="text-[9px] bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                              title={`Huella Digital activa con ${u.webAuthnCredentials?.length || 1} dispositivo(s) vinculado(s)`}
                            >
                              <Fingerprint className="w-3 h-3 text-blue-500" />
                              Huella Activa ({u.webAuthnCredentials?.length || 1})
                            </span>
                          ) : u.webAuthnRequired ? (
                            <span
                              className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                              title="Huella Digital Obligatoria: Pendiente de vinculación al iniciar sesión"
                            >
                              <Fingerprint className="w-3 h-3 text-amber-500" />
                              Huella Obligatoria (Pendiente)
                            </span>
                          ) : null}

                          {/* Auto-logout Inactivity Badge */}
                          {u.autoLogoutEnabled !== false ? (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border ${
                                isDark
                                  ? 'bg-[#16234F] text-[#9AA6C9] border-[#223368]'
                                  : 'bg-white text-[#78716C] border-[#E8DFC8]'
                              }`}
                              title={`Cierre automático por inactividad: ${u.autoLogoutMinutes || 20} minutos`}
                            >
                              <Clock className="w-2.5 h-2.5 text-[#FF6FA5]" />
                              {u.autoLogoutMinutes || 20}m
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full opacity-60 border ${
                                isDark ? 'border-[#223368] text-[#9AA6C9]' : 'border-[#E8DFC8] text-[#78716C]'
                              }`}
                              title="Auto-cierre por inactividad desactivado"
                            >
                              Sin auto-cierre
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

                        {/* 3.1 Gestión MFA / 2FA (Admin) */}
                        {canAdminResetPasswords && (
                          <button
                            type="button"
                            onClick={() => handleOpenMfaModal(u)}
                            className={`px-2.5 py-1 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                              u.twoFactorEnabled
                                ? isDark
                                  ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                                : u.twoFactorRequired
                                ? isDark
                                  ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                                : isDark
                                ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9] hover:text-white'
                                : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                            }`}
                            title="Gestionar 2FA: Resetear celular perdido, Forzar obligatoriedad o Desactivar"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                            <span>MFA / 2FA</span>
                          </button>
                        )}

                        {/* 3.2 Gestión Huella Digital / Biometría (Admin) */}
                        {canAdminResetPasswords && (
                          <button
                            type="button"
                            onClick={() => handleOpenWebAuthnModal(u)}
                            className={`px-2.5 py-1 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                              u.webAuthnEnabled
                                ? isDark
                                  ? 'bg-blue-950/40 hover:bg-blue-900/60 border-blue-500/40 text-blue-300'
                                  : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800'
                                : u.webAuthnRequired
                                ? isDark
                                  ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                                : isDark
                                ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9] hover:text-white'
                                : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
                            }`}
                            title="Gestionar Huella Digital: Forzar obligatoriedad, ver equipos o resetear"
                          >
                            <Fingerprint className="w-3.5 h-3.5 text-blue-500" />
                            <span>Huella</span>
                            {u.webAuthnEnabled && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            )}
                          </button>
                        )}

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

      {/* Disable 2FA Confirmation Modal for Admin (Legacy quick confirmation) */}
      {confirmDisable2FAUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  ¿Desactivar 2FA?
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  {confirmDisable2FAUser.displayName || confirmDisable2FAUser.email}
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368] text-[#CBD5E1]' : 'bg-[#FAF8F5] border-[#E8DFC8] text-[#57534E]'
              }`}
            >
              <p>
                Al desactivar el Doble Factor (TOTP), el usuario podrá iniciar sesión únicamente con su correo y contraseña normal.
              </p>
              <p className="text-[11px] opacity-80">
                Utiliza esta opción si el empleado extravió su teléfono celular o desinstaló por error la aplicación autenticadora.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDisable2FAUser(null)}
                className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={disable2FALoading}
                onClick={handleConfirmDisable2FA}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {disable2FALoading ? 'Desactivando...' : 'Sí, Desactivar 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal: Full MFA / 2FA Management for Selected User (Jefe) */}
      {/* ========================================================= */}
      {selectedUserForMfa && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className={`w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Gestión de Doble Factor (MFA / 2FA)
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Usuario: <strong className={isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}>{selectedUserForMfa.displayName || selectedUserForMfa.email}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForMfa(null)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification messages */}
            {mfaActionSuccess && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{mfaActionSuccess}</span>
              </div>
            )}

            {mfaActionError && (
              <div
                className={`p-3 border rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                  isDark
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{mfaActionError}</span>
              </div>
            )}

            {/* Current Status Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-2xl border ${
                  selectedUserForMfa.twoFactorEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : selectedUserForMfa.twoFactorRequired
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Estado de Vinculación</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-xs">
                  {selectedUserForMfa.twoFactorEnabled ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Vinculado con App TOTP</span>
                    </>
                  ) : selectedUserForMfa.twoFactorRequired ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Pendiente de Vincular</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 opacity-60 shrink-0" />
                      <span>Sin App Vinculada</span>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  selectedUserForMfa.twoFactorRequired
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Regla de Acceso</span>
                <div className="flex items-center gap-1.5 mt-1 font-bold text-xs">
                  {selectedUserForMfa.twoFactorRequired ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span>Obligatorio (Forzado)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      <span>Opcional (Libre)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Lost Device / Reset 2FA */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    ¿El usuario perdió o cambió su teléfono celular?
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Si no puede generar el código de 6 dígitos porque extravió su celular o reinstaló su app, resetea su clave TOTP.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={mfaActionLoading}
                  onClick={handleResetMfaAndForce}
                  className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 text-center"
                  title="Borra la clave previa y obliga a escanear un nuevo QR al iniciar sesión"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${mfaActionLoading ? 'animate-spin' : ''}`} />
                  <span>Resetear y Forzar Nuevo QR</span>
                </button>

                <button
                  type="button"
                  disabled={mfaActionLoading}
                  onClick={handleResetMfaOptional}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer disabled:opacity-50 text-center ${
                    isDark
                      ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#16234F] hover:text-white'
                      : 'border-[#E8DFC8] text-[#78716C] hover:bg-white hover:text-[#1A2B5C]'
                  }`}
                  title="Borra la clave previa y permite entrar solo con contraseña"
                >
                  <span>Resetear y Dejar Opcional</span>
                </button>
              </div>
            </div>

            {/* Section 2: Force / Require 2FA policy */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Exigir Uso Obligatorio de Doble Factor
                  </h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {selectedUserForMfa.twoFactorRequired
                      ? 'Este usuario tiene 2FA como requisito indispensable para ingresar al sistema.'
                      : 'Actualmente el usuario puede ingresar sin activar 2FA si así lo prefiere.'}
                  </p>
                </div>
              </div>

              <div>
                {selectedUserForMfa.twoFactorRequired ? (
                  <button
                    type="button"
                    disabled={mfaActionLoading}
                    onClick={() => handleToggleUserMfaRequired(false)}
                    className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                      isDark
                        ? 'border-purple-500/40 text-purple-300 hover:bg-purple-950/40'
                        : 'border-purple-300 text-purple-800 hover:bg-purple-50'
                    }`}
                  >
                    <span>🔓 Quitar Obligatoriedad (Hacer Opcional)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={mfaActionLoading}
                    onClick={() => handleToggleUserMfaRequired(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>⚡ Exigir 2FA Obligatorio a este Usuario</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Disable 2FA Completely */}
            {(selectedUserForMfa.twoFactorEnabled || selectedUserForMfa.twoFactorRequired) && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Desactivar 2FA Totalmente
                  </h4>
                  <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Borra la clave vinculada y quita cualquier obligatoriedad.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={mfaActionLoading}
                  onClick={handleDisableMfaTotal}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Desactivar</span>
                </button>
              </div>
            )}

            {/* Close modal button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForMfa(null)}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                }`}
              >
                Cerrar Panel MFA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal: Global MFA / 2FA Policy for All Users (Jefe)       */}
      {/* ========================================================= */}
      {showGlobalMfaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className={`w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-5 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Política Global de Seguridad 2FA
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Configuración colectiva para todas las cuentas del sistema
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalMfaModal(false)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'}`}>
                <span className="text-base font-black block">{users.length}</span>
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Usuarios</span>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span className="text-base font-black block">{users.filter((u) => u.twoFactorEnabled).length}</span>
                <span className="text-[10px] font-bold">2FA Activo</span>
              </div>
              <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                <span className="text-base font-black block">{users.filter((u) => u.twoFactorRequired).length}</span>
                <span className="text-[10px] font-bold">Obligatorios</span>
              </div>
            </div>

            {/* Option 1: Force all */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-purple-500/40' : 'bg-purple-50/60 border-purple-300'
              }`}
            >
              <div>
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  ⚡ Exigir 2FA Obligatorio a Todo el Personal
                </h4>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Todo usuario que inicie sesión deberá tener o configurar obligatoriamente su aplicación autenticadora (TOTP). No podrán omitir este paso.
                </p>
              </div>

              <button
                type="button"
                disabled={globalMfaLoading}
                onClick={() => handleSetGlobalMfaPolicy(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {globalMfaLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Aplicar 2FA Obligatorio a Todos</span>
                  </>
                )}
              </button>
            </div>

            {/* Option 2: Make optional for all */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div>
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  🔓 Hacer 2FA Opcional para Todo el Personal
                </h4>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Quita la exigencia forzada. Los usuarios que deseen activar 2FA podrán hacerlo voluntariamente desde su perfil.
                </p>
              </div>

              <button
                type="button"
                disabled={globalMfaLoading}
                onClick={() => handleSetGlobalMfaPolicy(false)}
                className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#16234F] hover:text-white'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-white hover:text-[#1A2B5C]'
                }`}
              >
                <span>Hacer 2FA Opcional General</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowGlobalMfaModal(false)}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Dedicated WebAuthn / Huella Digital Management for Admin */}
      {selectedUserForWebAuthn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Gestión de Huella Digital y Biometría
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {selectedUserForWebAuthn.displayName || selectedUserForWebAuthn.email} ({selectedUserForWebAuthn.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForWebAuthn(null)}
                className={`p-1.5 rounded-xl cursor-pointer transition ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#16234F]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#F5EFE0]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            {webAuthnActionError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{webAuthnActionError}</span>
              </div>
            )}

            {webAuthnActionSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-2 font-medium">
                <Check className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span>{webAuthnActionSuccess}</span>
              </div>
            )}

            {/* Current Biometrics Status */}
            <div
              className={`p-4 rounded-2xl border space-y-2.5 ${
                selectedUserForWebAuthn.webAuthnEnabled
                  ? isDark
                    ? 'bg-blue-950/30 border-blue-500/40'
                    : 'bg-blue-50/70 border-blue-300'
                  : isDark
                  ? 'bg-[#16234F] border-[#223368]'
                  : 'bg-[#FAF8F5] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Estado de Huella en Cuenta
                </span>
                {selectedUserForWebAuthn.webAuthnEnabled ? (
                  <span className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Huella Digital Activa
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border border-dashed ${
                    isDark ? 'border-[#223368] text-[#9AA6C9]' : 'border-[#E8DFC8] text-[#78716C]'
                  }`}>
                    Sin Huella Vinculada
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Política asignada:
                </span>
                {selectedUserForWebAuthn.webAuthnRequired ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    ⚡ Obligatoria (Exigida al iniciar sesión)
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isDark ? 'bg-[#0F1B3C] text-[#9AA6C9]' : 'bg-white text-[#78716C]'
                  }`}>
                    Opcional
                  </span>
                )}
              </div>

              {/* Enrolled credentials list */}
              {selectedUserForWebAuthn.webAuthnCredentials && selectedUserForWebAuthn.webAuthnCredentials.length > 0 && (
                <div className="pt-2 border-t border-dashed border-current/20 space-y-2">
                  <span className={`text-[11px] font-bold block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Dispositivos Biométricos Registrados ({selectedUserForWebAuthn.webAuthnCredentials.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedUserForWebAuthn.webAuthnCredentials.map((cred) => (
                      <div
                        key={cred.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-white border-[#E8DFC8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Laptop className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className={`font-semibold truncate text-[11px] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                              {cred.deviceName || 'Dispositivo biométrico'}
                            </p>
                            <p className={`text-[9px] opacity-75 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                              Registrado: {cred.createdAt ? new Date(cred.createdAt).toLocaleDateString() : 'N/D'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={webAuthnActionLoading}
                          onClick={() => handleDeleteUserWebAuthnCredential(cred.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                          title="Revocar este sensor o equipo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="space-y-3">
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Acciones de Administración
              </h4>

              {/* Action 1: Toggle Force Requirement */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-[#FAF8F5] border-[#E8DFC8]'
                }`}
              >
                <div>
                  <h5 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    {selectedUserForWebAuthn.webAuthnRequired
                      ? '🔓 Quitar Exigencia de Huella'
                      : '⚡ Forzar Huella Digital Obligatoria'}
                  </h5>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {selectedUserForWebAuthn.webAuthnRequired
                      ? 'El usuario ya no estará obligado a usar huella digital. El uso de biometría será voluntario.'
                      : 'Al iniciar sesión, el sistema exigirá que el usuario toque su sensor de huella para vincular su equipo antes de ingresar.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={webAuthnActionLoading}
                  onClick={() => handleToggleUserWebAuthnRequired(!selectedUserForWebAuthn.webAuthnRequired)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                    selectedUserForWebAuthn.webAuthnRequired
                      ? isDark
                        ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border border-[#223368] text-[#9AA6C9]'
                        : 'bg-white hover:bg-[#F5EFE0] border border-[#E8DFC8] text-[#78716C]'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>
                    {selectedUserForWebAuthn.webAuthnRequired
                      ? 'Hacer Huella Digital Opcional'
                      : 'Establecer Huella como Obligatoria'}
                  </span>
                </button>
              </div>

              {/* Action 2: Reset / Revoke Biometrics */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-[#FAF8F5] border-[#E8DFC8]'
                }`}
              >
                <div>
                  <h5 className={`text-xs font-bold text-rose-500 dark:text-rose-400`}>
                    Restablecer / Dispositivo Cambiado o Extraviado
                  </h5>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Elimina todos los registros de huella vinculados a este usuario para que pueda reconfigurar un nuevo sensor o teléfono.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={webAuthnActionLoading}
                    onClick={handleResetWebAuthnForce}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resetear y Exigir Nueva</span>
                  </button>

                  <button
                    type="button"
                    disabled={webAuthnActionLoading}
                    onClick={handleResetWebAuthnOptional}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isDark
                        ? 'border-rose-900/60 hover:bg-rose-950/50 text-rose-300'
                        : 'border-rose-300 hover:bg-rose-50 text-rose-700'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Resetear y Desactivar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForWebAuthn(null)}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#16234F]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#F5EFE0]'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Global WebAuthn / Huella Digital Policy for Admin */}
      {showGlobalWebAuthnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Política Global de Huella Digital
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Configuración biométrica para toda la empresa
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGlobalWebAuthnModal(false)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'}`}>
                <span className="text-base font-black block">{users.length}</span>
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Usuarios</span>
              </div>
              <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                <span className="text-base font-black block">{users.filter((u) => u.webAuthnEnabled).length}</span>
                <span className="text-[10px] font-bold">Huella Activa</span>
              </div>
              <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span className="text-base font-black block">{users.filter((u) => u.webAuthnRequired).length}</span>
                <span className="text-[10px] font-bold">Obligatorios</span>
              </div>
            </div>

            {/* Option 1: Force all */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-blue-500/40' : 'bg-blue-50/60 border-blue-300'
              }`}
            >
              <div>
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  ⚡ Exigir Huella Digital Obligatoria a Todo el Personal
                </h4>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Todo usuario que inicie sesión en un equipo compatible con sensor biométrico (Touch ID, Windows Hello o sensor de smartphone) deberá vincular su huella para mayor seguridad.
                </p>
              </div>

              <button
                type="button"
                disabled={globalWebAuthnLoading}
                onClick={() => handleSetGlobalWebAuthnPolicy(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {globalWebAuthnLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Aplicar Huella Obligatoria a Todos</span>
                  </>
                )}
              </button>
            </div>

            {/* Option 2: Make optional for all */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div>
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  🔓 Hacer Huella Digital Opcional para Todo el Personal
                </h4>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Quita la exigencia forzada. Los usuarios podrán seguir activando o usando su huella voluntariamente desde la configuración de su perfil.
                </p>
              </div>

              <button
                type="button"
                disabled={globalWebAuthnLoading}
                onClick={() => handleSetGlobalWebAuthnPolicy(false)}
                className={`w-full py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#16234F] hover:text-white'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-white hover:text-[#1A2B5C]'
                }`}
              >
                <span>Hacer Huella Opcional General</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowGlobalWebAuthnModal(false)}
                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-[#9AA6C9] hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-[#78716C] hover:bg-[#FBF7EF]'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
