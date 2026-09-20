import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Order, UserRole } from '../types';

export const DEFAULT_ADMIN_PIN = '2026';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SECURITY_CONFIG_COLLECTION = 'system_config';
const SECURITY_CONFIG_DOC_ID = 'security';
const LOCAL_STORAGE_PIN_KEY = 'importadora_admin_approval_pin';

export interface DeliveryLockInfo {
  isDelivered: boolean;
  isLocked: boolean;
  daysSinceDelivery: number;
  deliveryDate: Date | null;
  remainingDays: number;
  formattedDeliveryDate: string;
  temporarilyUnlocked: boolean;
}

/**
 * Obtiene la fecha exacta en la que el pedido fue marcado como entregado/despachado
 */
export function getDeliveryDate(order: Order): Date | null {
  if (order.estado !== 'Entregado') {
    return null;
  }
  const dateStr = order.entregadoAt || order.despachadoAt || order.fechaEnvio || order.updatedAt || order.createdAt;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(order.createdAt) : d;
}

/**
 * Calcula los días transcurridos desde que el pedido fue entregado
 */
export function getDaysSinceDelivery(order: Order): number {
  const deliveryDate = getDeliveryDate(order);
  if (!deliveryDate) return 0;
  const diff = Date.now() - deliveryDate.getTime();
  return Math.max(0, diff / (1000 * 60 * 60 * 24));
}

/**
 * Evalúa si una venta está bloqueada por haber sido entregada hace más de 7 días
 */
export function isOrderDeliveryLocked(order: Order): boolean {
  if (order.estado !== 'Entregado') {
    return false;
  }
  if (order.desbloqueadoTemporalmente) {
    return false;
  }
  const days = getDaysSinceDelivery(order);
  return days >= 7;
}

/**
 * Retorna información detallada del estado de bloqueo por entrega (+7 días)
 */
export function getDeliveryLockInfo(order: Order): DeliveryLockInfo {
  const isDelivered = order.estado === 'Entregado';
  const deliveryDate = getDeliveryDate(order);
  const daysSinceDelivery = isDelivered ? getDaysSinceDelivery(order) : 0;
  const isLocked = isDelivered && !order.desbloqueadoTemporalmente && daysSinceDelivery >= 7;
  const remainingDays = Math.max(0, Math.ceil(7 - daysSinceDelivery));

  let formattedDeliveryDate = '';
  if (deliveryDate) {
    try {
      formattedDeliveryDate = new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(deliveryDate);
    } catch {
      formattedDeliveryDate = deliveryDate.toLocaleDateString();
    }
  }

  return {
    isDelivered,
    isLocked,
    daysSinceDelivery,
    deliveryDate,
    remainingDays,
    formattedDeliveryDate,
    temporarilyUnlocked: !!order.desbloqueadoTemporalmente,
  };
}

/**
 * Obtiene el PIN de Aprobación del Administrador desde Firestore o fallback
 */
export async function getAdminApprovalPin(): Promise<string> {
  try {
    const docRef = doc(db, SECURITY_CONFIG_COLLECTION, SECURITY_CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.adminApprovalPin) {
      const pin = String(snap.data().adminApprovalPin).trim();
      localStorage.setItem(LOCAL_STORAGE_PIN_KEY, pin);
      return pin;
    }
    // Si aún no existe en Firestore, lo inicializamos con el PIN por defecto
    await setDoc(docRef, {
      adminApprovalPin: DEFAULT_ADMIN_PIN,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Sistema Inicial',
    }, { merge: true });
    localStorage.setItem(LOCAL_STORAGE_PIN_KEY, DEFAULT_ADMIN_PIN);
    return DEFAULT_ADMIN_PIN;
  } catch (err) {
    console.warn('Error reading admin approval pin from Firestore, using fallback:', err);
    return localStorage.getItem(LOCAL_STORAGE_PIN_KEY) || DEFAULT_ADMIN_PIN;
  }
}

/**
 * Actualiza el PIN de Aprobación de Administración / Jefatura
 */
export async function setAdminApprovalPin(newPin: string, updatedBy = 'Administración'): Promise<void> {
  const cleanPin = newPin.trim();
  if (!cleanPin || cleanPin.length < 4) {
    throw new Error('El PIN de aprobación debe tener al menos 4 dígitos o caracteres.');
  }

  const docRef = doc(db, SECURITY_CONFIG_COLLECTION, SECURITY_CONFIG_DOC_ID);
  const nowIso = new Date().toISOString();
  await setDoc(docRef, {
    adminApprovalPin: cleanPin,
    updatedAt: nowIso,
    updatedBy,
  }, { merge: true });

  localStorage.setItem(LOCAL_STORAGE_PIN_KEY, cleanPin);
}

/**
 * Valida si un PIN ingresado por un supervisor coincide con el PIN del Administrador
 */
export async function verifyAdminApprovalPin(enteredPin: string): Promise<boolean> {
  const currentPin = await getAdminApprovalPin();
  return enteredPin.trim() === currentPin.trim();
}
