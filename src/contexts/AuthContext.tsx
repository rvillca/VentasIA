import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  currentUser: { uid: string; email: string; displayName: string } | null;
  userProfile: AppUser | null;
  loading: boolean;
  role: UserRole;
  isJefe: boolean;
  isSupervisor: boolean;
  isComprador: boolean;
  isVendedor: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canAccessCompras: boolean;
  canDeleteOrders: boolean;
  canAdminResetPasswords: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  registerNewUserByJefe: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  changeMyPassword: (oldPass: string, newPass: string) => Promise<void>;
  adminResetUserPassword: (targetEmail: string, newPass: string) => Promise<void>;
  updateUserAccount: (targetUid: string, updates: Partial<AppUser> & { newPassword?: string }) => Promise<void>;
  deleteUserAccount: (targetUid: string, targetEmail: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const JEFE_EMAIL = 'rvillca@outlook.com';
const STORAGE_AUTH_KEY = 'ventasia_auth_session';
const STORAGE_CREDENTIALS_KEY = 'ventasia_registered_passwords';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to load registered credentials map
  const getStoredPasswords = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(STORAGE_CREDENTIALS_KEY);
      const base: Record<string, string> = {
        'rvillca@outlook.com': '220987',
      };
      if (raw) {
        return { ...base, ...JSON.parse(raw) };
      }
      return base;
    } catch {
      return { 'rvillca@outlook.com': '220987' };
    }
  };

  const saveStoredPassword = (email: string, pass: string) => {
    try {
      const current = getStoredPasswords();
      current[email.toLowerCase().trim()] = pass;
      localStorage.setItem(STORAGE_CREDENTIALS_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn('Could not save password to storage:', err);
    }
  };

  // Restore session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedSession = localStorage.getItem(STORAGE_AUTH_KEY);
        if (savedSession) {
          const profile: AppUser = JSON.parse(savedSession);
          const isBoss = profile.email.toLowerCase() === JEFE_EMAIL.toLowerCase();
          const cleanProfile: AppUser = {
            ...profile,
            role: isBoss ? 'jefe' : profile.role || 'vendedor',
          };
          setUserProfile(cleanProfile);
          setCurrentUser({
            uid: cleanProfile.uid,
            email: cleanProfile.email,
            displayName: cleanProfile.displayName,
          });

          // Sync profile from Firestore in background
          try {
            const docRef = doc(db, 'users', cleanProfile.uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const liveData = snap.data() as AppUser;
              if (liveData.disabled && !isBoss) {
                // Account was disabled by admin
                localStorage.removeItem(STORAGE_AUTH_KEY);
                setUserProfile(null);
                setCurrentUser(null);
                setLoading(false);
                return;
              }
              setUserProfile({
                ...liveData,
                role: isBoss ? 'jefe' : liveData.role || 'vendedor',
              });
            } else {
              await setDoc(docRef, cleanProfile, { merge: true });
            }
          } catch (fireErr) {
            console.warn('Firestore sync note:', fireErr);
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isBoss = cleanEmail === JEFE_EMAIL.toLowerCase();

    const storedPasswords = getStoredPasswords();
    const knownPass = storedPasswords[cleanEmail];

    // Check Jefe credentials
    if (isBoss) {
      const validPass = knownPass || '220987';
      if (pass !== validPass && pass !== '220987') {
        throw new Error('Contraseña incorrecta para la cuenta del Jefe.');
      }

      const jefeProfile: AppUser = {
        uid: 'jefe_rvillca',
        email: 'rvillca@outlook.com',
        displayName: 'Rodrigo Villca (Jefe)',
        role: 'jefe',
        createdAt: new Date().toISOString(),
      };

      // Save session
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(jefeProfile));
      saveStoredPassword(cleanEmail, pass);
      setUserProfile(jefeProfile);
      setCurrentUser({
        uid: jefeProfile.uid,
        email: jefeProfile.email,
        displayName: jefeProfile.displayName,
      });

      // Upsert in Firestore
      try {
        await setDoc(doc(db, 'users', jefeProfile.uid), jefeProfile, { merge: true });
      } catch (e) {
        console.warn('Firestore user save note:', e);
      }
      return;
    }

    // Check other registered team members
    if (knownPass && knownPass !== pass) {
      throw new Error('Contraseña incorrecta.');
    }

    // Try finding in Firestore
    let matchedUser: AppUser | null = null;
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const querySnap = await getDocs(usersQuery);
      if (!querySnap.empty) {
        matchedUser = { ...querySnap.docs[0].data(), uid: querySnap.docs[0].id } as AppUser;
      }
    } catch (e) {
      console.warn('Firestore lookup note:', e);
    }

    // Block deactivated accounts
    if (matchedUser && matchedUser.disabled) {
      throw new Error('Esta cuenta ha sido desactivada por el administrador. Comunícate con gerencia.');
    }

    const effectiveProfile: AppUser = matchedUser || {
      uid: 'user_' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0] || 'Vendedor',
      role: 'vendedor',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(effectiveProfile));
    saveStoredPassword(cleanEmail, pass);
    setUserProfile(effectiveProfile);
    setCurrentUser({
      uid: effectiveProfile.uid,
      email: effectiveProfile.email,
      displayName: effectiveProfile.displayName,
    });

    try {
      await setDoc(doc(db, 'users', effectiveProfile.uid), effectiveProfile, { merge: true });
    } catch {}
  };

  const register = async (email: string, pass: string, name?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isBoss = cleanEmail === JEFE_EMAIL.toLowerCase();
    const displayName = name?.trim() || (isBoss ? 'Rodrigo Villca (Jefe)' : cleanEmail.split('@')[0] || 'Vendedor');
    const role: UserRole = isBoss ? 'jefe' : 'vendedor';
    const uid = isBoss ? 'jefe_rvillca' : 'user_' + Date.now().toString(36);

    const newProfile: AppUser = {
      uid,
      email: cleanEmail,
      displayName,
      role,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(newProfile));
    saveStoredPassword(cleanEmail, pass);
    setUserProfile(newProfile);
    setCurrentUser({
      uid: newProfile.uid,
      email: newProfile.email,
      displayName: newProfile.displayName,
    });

    try {
      await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
    } catch (e) {
      console.warn('Firestore user registration note:', e);
    }
  };

  const registerNewUserByJefe = async (
    targetEmail: string,
    targetPass: string,
    targetName: string,
    targetRole: UserRole
  ) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const uid = 'usr_' + Date.now().toString(36);

    const newMember: AppUser = {
      uid,
      email: cleanEmail,
      displayName: targetName.trim(),
      role: targetRole,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.email || 'Jefe',
    };

    saveStoredPassword(cleanEmail, targetPass);

    try {
      await setDoc(doc(db, 'users', uid), newMember, { merge: true });
    } catch (e) {
      console.warn('Firestore user save note:', e);
    }
  };

  // Change own password
  const changeMyPassword = async (oldPass: string, newPass: string) => {
    if (!currentUser) throw new Error('No hay una sesión activa.');
    const email = currentUser.email.toLowerCase().trim();
    const storedPasswords = getStoredPasswords();
    const currentRegisteredPass = storedPasswords[email] || (email === JEFE_EMAIL.toLowerCase() ? '220987' : '');

    if (currentRegisteredPass && oldPass !== currentRegisteredPass) {
      throw new Error('La contraseña actual es incorrecta.');
    }

    if (newPass.length < 4) {
      throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
    }

    saveStoredPassword(email, newPass);
  };

  // Admin / Supervisor reset user password
  const adminResetUserPassword = async (targetEmail: string, newPass: string) => {
    const isBossOrSupervisor =
      currentUser?.email?.toLowerCase() === JEFE_EMAIL.toLowerCase() ||
      userProfile?.role === 'jefe' ||
      userProfile?.role === 'supervisor';

    if (!isBossOrSupervisor) {
      throw new Error('Solo el Jefe y el Supervisor tienen permiso para cambiar contraseñas de usuarios.');
    }

    if (newPass.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    saveStoredPassword(cleanEmail, newPass);
  };

  // Admin / Jefe update user account details (name, email, role, disabled, permissions, optional password)
  const updateUserAccount = async (
    targetUid: string,
    updates: Partial<AppUser> & { newPassword?: string }
  ) => {
    if (!isJefe) {
      throw new Error('Solo el Jefe / Administrador tiene permiso para modificar cuentas de usuario.');
    }

    const { newPassword, ...firestoreUpdates } = updates;

    const isTargetBoss =
      targetUid === 'jefe_rvillca' ||
      updates.email?.toLowerCase() === JEFE_EMAIL.toLowerCase() ||
      (userProfile?.uid === targetUid && userProfile.email.toLowerCase() === JEFE_EMAIL.toLowerCase());

    if (isTargetBoss) {
      if (firestoreUpdates.role && firestoreUpdates.role !== 'jefe') {
        throw new Error('La cuenta principal del Jefe no puede cambiar su rol.');
      }
      if (firestoreUpdates.disabled === true) {
        throw new Error('No es posible desactivar la cuenta principal del Jefe.');
      }
    }

    const cleanUpdates: Record<string, any> = {};
    Object.entries(firestoreUpdates).forEach(([k, v]) => {
      if (v !== undefined) cleanUpdates[k] = v;
    });
    cleanUpdates.updatedAt = new Date().toISOString();

    await updateDoc(doc(db, 'users', targetUid), cleanUpdates);

    // If newPassword provided, save in credentials
    if (newPassword && newPassword.length >= 4) {
      const emailToUpdate = updates.email || (userProfile?.email);
      if (emailToUpdate) {
        saveStoredPassword(emailToUpdate.toLowerCase().trim(), newPassword);
      }
    }

    // If current logged-in user is being modified, update active session
    if (currentUser?.uid === targetUid) {
      const updatedProfile: AppUser = {
        ...(userProfile || {
          uid: targetUid,
          email: updates.email || currentUser.email,
          displayName: updates.displayName || currentUser.displayName,
          role: 'jefe',
          createdAt: new Date().toISOString(),
        }),
        ...cleanUpdates,
      } as AppUser;

      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      setCurrentUser({
        uid: targetUid,
        email: updatedProfile.email,
        displayName: updatedProfile.displayName,
      });
    }
  };

  // Admin / Jefe delete user account permanently
  const deleteUserAccount = async (targetUid: string, targetEmail: string) => {
    if (!isJefe) {
      throw new Error('Solo el Jefe / Administrador tiene permiso para eliminar cuentas.');
    }

    const cleanTargetEmail = targetEmail.toLowerCase().trim();
    if (cleanTargetEmail === JEFE_EMAIL.toLowerCase() || targetUid === 'jefe_rvillca') {
      throw new Error('No es posible eliminar la cuenta principal del Jefe.');
    }

    if (currentUser?.uid === targetUid) {
      throw new Error('No puedes eliminar tu propia cuenta mientras estés en sesión activa.');
    }

    // Delete from Firestore
    await deleteDoc(doc(db, 'users', targetUid));

    // Delete stored credentials
    try {
      const stored = getStoredPasswords();
      delete stored[cleanTargetEmail];
      localStorage.setItem(STORAGE_CREDENTIALS_KEY, JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not clean stored passwords:', e);
    }
  };

  const logout = async () => {
    localStorage.removeItem(STORAGE_AUTH_KEY);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const effectiveRole: UserRole =
    currentUser?.email?.toLowerCase() === JEFE_EMAIL.toLowerCase()
      ? 'jefe'
      : userProfile?.role || 'vendedor';

  const isJefe = effectiveRole === 'jefe';
  const isSupervisor = effectiveRole === 'supervisor' || isJefe;
  const isComprador = effectiveRole === 'comprador';
  const isVendedor = effectiveRole === 'vendedor';

  const canManageUsers = isJefe;
  const canViewReports = isSupervisor || isJefe || isComprador;
  const canAccessCompras = isJefe || isSupervisor || isComprador || !!userProfile?.comprasAccess;
  const canDeleteOrders = isJefe;
  const canAdminResetPasswords = isSupervisor || isJefe;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        role: effectiveRole,
        isJefe,
        isSupervisor,
        isComprador,
        isVendedor,
        canManageUsers,
        canViewReports,
        canAccessCompras,
        canDeleteOrders,
        canAdminResetPasswords,
        login,
        register,
        registerNewUserByJefe,
        changeMyPassword,
        adminResetUserPassword,
        updateUserAccount,
        deleteUserAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
