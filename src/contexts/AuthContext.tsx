import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
import { verifyTotpCode, generateTotpSecret } from '../lib/totp';

export interface LoginResult {
  require2FA?: boolean;
  require2FASetup?: boolean;
  userEmail?: string;
  userDisplayName?: string;
  setupSecret?: string;
}

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
  canViewSeguimiento: boolean;
  canAccessCompras: boolean;
  canDeleteOrders: boolean;
  canAdminResetPasswords: boolean;
  login: (email: string, pass: string, twoFactorCode?: string, setupSecret?: string) => Promise<LoginResult | void>;
  loginAsJefe: () => Promise<LoginResult | void>;
  resetJefePassword: (newPass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  registerNewUserByJefe: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  changeMyPassword: (oldPass: string, newPass: string) => Promise<void>;
  adminResetUserPassword: (targetEmail: string, newPass: string) => Promise<void>;
  updateUserAccount: (targetUid: string, updates: Partial<AppUser> & { newPassword?: string }) => Promise<void>;
  deleteUserAccount: (targetUid: string, targetEmail: string) => Promise<void>;
  enableTwoFactor: (secretBase32: string, verificationCode: string) => Promise<void>;
  disableTwoFactor: (passwordOrCode: string) => Promise<void>;
  adminResetUserTwoFactor: (targetUid: string, forceReconfigure?: boolean) => Promise<void>;
  adminToggleForceTwoFactor: (targetUid: string, required: boolean) => Promise<void>;
  adminDisableUserTwoFactor: (targetUid: string) => Promise<void>;
  adminSetAllUsersTwoFactorRequired: (required: boolean) => Promise<void>;
  updateSecurityPreferences: (prefs: { autoLogoutEnabled?: boolean; autoLogoutMinutes?: number }) => Promise<void>;
  resetInactivityTimer: () => void;
  showInactivityWarning: boolean;
  remainingInactivitySeconds: number | null;
  logout: (reason?: 'inactivity' | 'user') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const JEFE_EMAIL = 'rvillca@outlook.com';
const STORAGE_AUTH_KEY = 'ventasia_auth_session';
const STORAGE_CREDENTIALS_KEY = 'ventasia_registered_passwords';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity auto-logout state
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [remainingInactivitySeconds, setRemainingInactivitySeconds] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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

  // Inactivity auto-logout hook and event listeners
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    setRemainingInactivitySeconds(null);
  }, []);

  const logout = useCallback(async (reason?: 'inactivity' | 'user') => {
    if (reason === 'inactivity') {
      sessionStorage.setItem('ventasia_logged_out_reason', 'inactivity');
    }
    localStorage.removeItem(STORAGE_AUTH_KEY);
    setCurrentUser(null);
    setUserProfile(null);
    setShowInactivityWarning(false);
    setRemainingInactivitySeconds(null);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setShowInactivityWarning(false);
      setRemainingInactivitySeconds(null);
      return;
    }

    const isEnabled = userProfile?.autoLogoutEnabled !== false;
    if (!isEnabled) {
      setShowInactivityWarning(false);
      setRemainingInactivitySeconds(null);
      return;
    }

    const timeoutMinutes = userProfile?.autoLogoutMinutes && userProfile.autoLogoutMinutes > 0
      ? userProfile.autoLogoutMinutes
      : 20; // Default 20 minutes
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = 60 * 1000; // Warning in the last 60 seconds

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      setShowInactivityWarning(false);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    let throttleTimer: any = null;
    const throttledActivity = () => {
      if (!throttleTimer) {
        handleUserActivity();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000);
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, throttledActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const timeLeft = timeoutMs - elapsed;

      if (timeLeft <= 0) {
        clearInterval(checkInterval);
        sessionStorage.setItem('ventasia_logged_out_reason', 'inactivity');
        sessionStorage.setItem('ventasia_inactivity_minutes', String(timeoutMinutes));
        logout('inactivity');
      } else if (timeLeft <= warningMs) {
        setShowInactivityWarning(true);
        setRemainingInactivitySeconds(Math.ceil(timeLeft / 1000));
      } else {
        setShowInactivityWarning(false);
        setRemainingInactivitySeconds(null);
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          sessionStorage.setItem('ventasia_logged_out_reason', 'inactivity');
          sessionStorage.setItem('ventasia_inactivity_minutes', String(timeoutMinutes));
          logout('inactivity');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, throttledActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [currentUser, userProfile?.autoLogoutEnabled, userProfile?.autoLogoutMinutes, logout]);

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

  const login = async (
    email: string,
    pass: string,
    twoFactorCode?: string,
    setupSecret?: string
  ): Promise<LoginResult | void> => {
    const cleanEmail = email.trim().toLowerCase();
    const isBoss = cleanEmail === JEFE_EMAIL.toLowerCase();

    const storedPasswords = getStoredPasswords();
    let knownPass = storedPasswords[cleanEmail];

    // Check Firestore for stored password and 2FA status for this email/user
    let matchedUser: AppUser | null = null;
    try {
      if (isBoss) {
        const jefeSnap = await getDoc(doc(db, 'users', 'jefe_rvillca'));
        if (jefeSnap.exists()) {
          const jefeData = jefeSnap.data() as AppUser;
          matchedUser = { ...jefeData, uid: 'jefe_rvillca' };
          if (jefeData.password) {
            knownPass = jefeData.password;
          }
        }
      } else {
        const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const querySnap = await getDocs(usersQuery);
        if (!querySnap.empty) {
          const uData = querySnap.docs[0].data() as AppUser;
          matchedUser = { ...uData, uid: querySnap.docs[0].id };
          if (uData.password) {
            knownPass = uData.password;
          }
        }
      }
    } catch (e) {
      console.warn('Firestore user lookup note:', e);
    }

    // Check Jefe credentials
    if (isBoss) {
      const validPass = knownPass || '220987';
      // Jefe can always authenticate with their current password OR the master default 220987
      if (pass !== validPass && pass !== '220987') {
        throw new Error('Contraseña incorrecta para la cuenta del Jefe. La clave por defecto es: 220987');
      }

      // Check if 2FA is forced/required by policy but not yet configured
      if (matchedUser?.twoFactorRequired && !matchedUser.twoFactorEnabled) {
        if (!twoFactorCode || !setupSecret) {
          const newSecret = generateTotpSecret();
          return {
            require2FASetup: true,
            userEmail: cleanEmail,
            userDisplayName: matchedUser?.displayName || 'Rodrigo Villca (Jefe)',
            setupSecret: newSecret,
          };
        }

        const isCodeValid = verifyTotpCode(setupSecret, twoFactorCode);
        if (!isCodeValid) {
          throw new Error('Código de 6 dígitos incorrecto o expirado. Revisa tu app autenticadora.');
        }

        matchedUser.twoFactorEnabled = true;
        matchedUser.twoFactorSecret = setupSecret;
        matchedUser.twoFactorCreatedAt = new Date().toISOString();
      } else if (matchedUser?.twoFactorEnabled && matchedUser.twoFactorSecret) {
        // Standard 2FA code check
        if (!twoFactorCode) {
          return {
            require2FA: true,
            userEmail: cleanEmail,
            userDisplayName: matchedUser.displayName || 'Rodrigo Villca (Jefe)',
          };
        }

        const isCodeValid = verifyTotpCode(matchedUser.twoFactorSecret, twoFactorCode);
        if (!isCodeValid) {
          throw new Error('Código de 2FA incorrecto o expirado. Revisa tu app autenticadora (Google Authenticator / Authy).');
        }
      }

      const jefeProfile: AppUser = {
        uid: 'jefe_rvillca',
        email: 'rvillca@outlook.com',
        displayName: matchedUser?.displayName || 'Rodrigo Villca (Jefe)',
        role: 'jefe',
        password: pass,
        createdAt: matchedUser?.createdAt || new Date().toISOString(),
        twoFactorEnabled: matchedUser?.twoFactorEnabled,
        twoFactorRequired: matchedUser?.twoFactorRequired,
        twoFactorSecret: matchedUser?.twoFactorSecret,
        twoFactorCreatedAt: matchedUser?.twoFactorCreatedAt,
        autoLogoutEnabled: matchedUser?.autoLogoutEnabled,
        autoLogoutMinutes: matchedUser?.autoLogoutMinutes,
      };

      // Save session and credentials
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(jefeProfile));
      saveStoredPassword(cleanEmail, pass);
      setUserProfile(jefeProfile);
      setCurrentUser({
        uid: jefeProfile.uid,
        email: jefeProfile.email,
        displayName: jefeProfile.displayName,
      });

      // Upsert in Firestore with password and updated 2FA
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

    // Block deactivated accounts
    if (matchedUser && matchedUser.disabled) {
      throw new Error('Esta cuenta ha sido desactivada por el administrador. Comunícate con gerencia.');
    }

    // Check if 2FA is forced/required by policy but not yet configured
    if (matchedUser?.twoFactorRequired && !matchedUser.twoFactorEnabled) {
      if (!twoFactorCode || !setupSecret) {
        const newSecret = generateTotpSecret();
        return {
          require2FASetup: true,
          userEmail: cleanEmail,
          userDisplayName: matchedUser?.displayName || cleanEmail.split('@')[0],
          setupSecret: newSecret,
        };
      }

      const isCodeValid = verifyTotpCode(setupSecret, twoFactorCode);
      if (!isCodeValid) {
        throw new Error('Código de 6 dígitos incorrecto o expirado. Revisa tu app autenticadora.');
      }

      matchedUser.twoFactorEnabled = true;
      matchedUser.twoFactorSecret = setupSecret;
      matchedUser.twoFactorCreatedAt = new Date().toISOString();
    } else if (matchedUser?.twoFactorEnabled && matchedUser.twoFactorSecret) {
      // Standard 2FA code check
      if (!twoFactorCode) {
        return {
          require2FA: true,
          userEmail: cleanEmail,
          userDisplayName: matchedUser.displayName || cleanEmail.split('@')[0],
        };
      }

      const isCodeValid = verifyTotpCode(matchedUser.twoFactorSecret, twoFactorCode);
      if (!isCodeValid) {
        throw new Error('Código de 2FA incorrecto o expirado. Revisa tu app autenticadora (Google Authenticator / Authy).');
      }
    }

    const effectiveProfile: AppUser = matchedUser || {
      uid: 'user_' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0] || 'Vendedor',
      role: 'vendedor',
      password: pass,
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
      await setDoc(doc(db, 'users', effectiveProfile.uid), { ...effectiveProfile, password: pass }, { merge: true });
    } catch {}
  };

  const loginAsJefe = async () => {
    return login(JEFE_EMAIL, '220987');
  };

  const resetJefePassword = async (newPass: string) => {
    if (newPass.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }
    saveStoredPassword(JEFE_EMAIL, newPass);
    try {
      await setDoc(
        doc(db, 'users', 'jefe_rvillca'),
        {
          uid: 'jefe_rvillca',
          email: 'rvillca@outlook.com',
          displayName: 'Rodrigo Villca (Jefe)',
          role: 'jefe',
          password: newPass,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore jefe password update note:', e);
    }
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
    let currentRegisteredPass = storedPasswords[email] || (email === JEFE_EMAIL.toLowerCase() ? '220987' : '');

    try {
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (uSnap.exists()) {
        const uData = uSnap.data() as AppUser;
        if (uData.password) {
          currentRegisteredPass = uData.password;
        }
      }
    } catch {}

    if (currentRegisteredPass && oldPass !== currentRegisteredPass && oldPass !== '220987') {
      throw new Error('La contraseña actual es incorrecta.');
    }

    if (newPass.length < 4) {
      throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
    }

    saveStoredPassword(email, newPass);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        password: newPass,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore password change note:', e);
    }
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

    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const querySnap = await getDocs(usersQuery);
      if (!querySnap.empty) {
        const targetDocRef = doc(db, 'users', querySnap.docs[0].id);
        await updateDoc(targetDocRef, { password: newPass, updatedAt: new Date().toISOString() });
      }
    } catch (e) {
      console.warn('Firestore password reset note:', e);
    }
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

    if (newPassword && newPassword.length >= 4) {
      cleanUpdates.password = newPassword;
      const emailToUpdate = updates.email || userProfile?.email;
      if (emailToUpdate) {
        saveStoredPassword(emailToUpdate.toLowerCase().trim(), newPassword);
      }
    }

    await updateDoc(doc(db, 'users', targetUid), cleanUpdates);

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

  // Enable Two-Factor Authentication (TOTP)
  const enableTwoFactor = async (secretBase32: string, verificationCode: string) => {
    if (!currentUser) throw new Error('No hay sesión activa.');
    const isValid = verifyTotpCode(secretBase32, verificationCode);
    if (!isValid) {
      throw new Error('El código de 6 dígitos ingresado es incorrecto o expiró. Revisa tu aplicación de autenticación.');
    }

    const updates: Partial<AppUser> = {
      twoFactorEnabled: true,
      twoFactorSecret: secretBase32,
      twoFactorCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });

    const updatedProfile: AppUser = {
      ...(userProfile || {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: effectiveRole,
        createdAt: new Date().toISOString(),
      }),
      ...updates,
    };

    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
  };

  // Disable Two-Factor Authentication
  const disableTwoFactor = async (passwordOrCode: string) => {
    if (!currentUser) throw new Error('No hay sesión activa.');
    const email = currentUser.email.toLowerCase().trim();
    const storedPasswords = getStoredPasswords();
    let currentRegisteredPass = storedPasswords[email] || (email === JEFE_EMAIL.toLowerCase() ? '220987' : '');
    if (userProfile?.password) {
      currentRegisteredPass = userProfile.password;
    }

    // Validate password or current TOTP code
    const isPassValid = passwordOrCode === currentRegisteredPass || (email === JEFE_EMAIL.toLowerCase() && passwordOrCode === '220987');
    const isCodeValid = userProfile?.twoFactorSecret ? verifyTotpCode(userProfile.twoFactorSecret, passwordOrCode) : false;

    if (!isPassValid && !isCodeValid) {
      throw new Error('Para desactivar 2FA debes ingresar tu contraseña actual o un código válido de tu app autenticadora.');
    }

    const updates: Partial<AppUser> = {
      twoFactorEnabled: false,
      twoFactorSecret: '',
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });

    const updatedProfile: AppUser = {
      ...userProfile!,
      twoFactorEnabled: false,
      twoFactorSecret: '',
    };

    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
  };

  // Admin/Jefe reset 2FA for another user who lost access to their phone
  const adminResetUserTwoFactor = async (targetUid: string, forceReconfigure: boolean = true) => {
    if (!isJefe) {
      throw new Error('Solo el Administrador / Jefe puede restablecer o desactivar el 2FA de otros usuarios.');
    }

    const updates: Partial<AppUser> = {
      twoFactorEnabled: false,
      twoFactorSecret: '',
      twoFactorRequired: forceReconfigure,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', targetUid), updates, { merge: true });

    if (currentUser?.uid === targetUid) {
      const updatedProfile: AppUser = {
        ...userProfile!,
        twoFactorEnabled: false,
        twoFactorSecret: '',
        twoFactorRequired: forceReconfigure,
      };
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
  };

  // Admin/Jefe toggle forcing 2FA for a specific user
  const adminToggleForceTwoFactor = async (targetUid: string, required: boolean) => {
    if (!isJefe) {
      throw new Error('Solo el Administrador / Jefe puede configurar la obligatoriedad de 2FA.');
    }

    const updates: Partial<AppUser> = {
      twoFactorRequired: required,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', targetUid), updates, { merge: true });

    if (currentUser?.uid === targetUid) {
      const updatedProfile: AppUser = {
        ...userProfile!,
        twoFactorRequired: required,
      };
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
  };

  // Admin/Jefe disable 2FA for another user who lost access to their device
  const adminDisableUserTwoFactor = async (targetUid: string) => {
    if (!isJefe) {
      throw new Error('Solo el Administrador / Jefe puede restablecer o desactivar el 2FA de otros usuarios.');
    }

    const updates: Partial<AppUser> = {
      twoFactorEnabled: false,
      twoFactorSecret: '',
      twoFactorRequired: false,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', targetUid), updates, { merge: true });

    if (currentUser?.uid === targetUid) {
      const updatedProfile: AppUser = {
        ...userProfile!,
        twoFactorEnabled: false,
        twoFactorSecret: '',
        twoFactorRequired: false,
      };
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
  };

  // Admin/Jefe set 2FA requirement for all registered users
  const adminSetAllUsersTwoFactorRequired = async (required: boolean) => {
    if (!isJefe) {
      throw new Error('Solo el Administrador / Jefe puede configurar la política global de 2FA.');
    }

    const querySnap = await getDocs(collection(db, 'users'));
    const promises: Promise<any>[] = [];
    const now = new Date().toISOString();

    querySnap.forEach((docSnap) => {
      promises.push(
        setDoc(
          doc(db, 'users', docSnap.id),
          {
            twoFactorRequired: required,
            updatedAt: now,
          },
          { merge: true }
        )
      );
    });

    await Promise.all(promises);

    if (userProfile) {
      const updatedProfile = { ...userProfile, twoFactorRequired: required };
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
  };

  // Update user security preferences (Inactivity timeout)
  const updateSecurityPreferences = async (prefs: { autoLogoutEnabled?: boolean; autoLogoutMinutes?: number }) => {
    if (!currentUser) throw new Error('No hay sesión activa.');
    const updates: Partial<AppUser> = {
      ...prefs,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });

    const updatedProfile: AppUser = {
      ...userProfile!,
      ...updates,
    };

    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
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
  // Supervisor and Jefe can view reports (with role-specific views)
  const canViewReports = isJefe || effectiveRole === 'supervisor';
  // Seguimiento de Cobros y Pagos is visible for Supervisor and Jefe
  const canViewSeguimiento = isJefe || effectiveRole === 'supervisor';
  const canAccessCompras = isJefe || effectiveRole === 'supervisor' || isComprador || !!userProfile?.comprasAccess;
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
        canViewSeguimiento,
        canAccessCompras,
        canDeleteOrders,
        canAdminResetPasswords,
        login,
        loginAsJefe,
        resetJefePassword,
        register,
        registerNewUserByJefe,
        changeMyPassword,
        adminResetUserPassword,
        updateUserAccount,
        deleteUserAccount,
        enableTwoFactor,
        disableTwoFactor,
        adminResetUserTwoFactor,
        adminToggleForceTwoFactor,
        adminDisableUserTwoFactor,
        adminSetAllUsersTwoFactorRequired,
        updateSecurityPreferences,
        resetInactivityTimer,
        showInactivityWarning,
        remainingInactivitySeconds,
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
