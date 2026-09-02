import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, AppUser, Purchase, PurchaseStatus } from '../types';
import { formatArticleItem, parseArticleFormat } from './packaging';
export { formatArticleItem, parseArticleFormat };

const ORDERS_COLLECTION = 'orders';
const PURCHASES_COLLECTION = 'purchases';
const USERS_COLLECTION = 'users';

export const INITIAL_SAMPLE_PURCHASES: Purchase[] = [
  {
    id: 'pur_101',
    purchaseNumber: 1,
    proveedor: 'Importadora Mayorista Sakura Kawaii',
    telefonoProveedor: '+591 76543210',
    numeroFacturaRecibo: 'REC-0842',
    metodoPago: 'Efectivo',
    fechaCompra: new Date(Date.now() - 3600000 * 48).toISOString(),
    productos: [
      {
        id: 'pitem_1',
        nombre: 'Lote Mochilas Kuromi & My Melody Gothic',
        categoria: 'Mochilas',
        variante: 'Surtido 10 modelos',
        cantidad: 15,
        costoUnitario: 110,
        subtotal: 1650,
      },
      {
        id: 'pitem_2',
        nombre: 'Cajas Set Plumones Punta Pincel x36',
        categoria: 'Papelería',
        variante: 'Caja tornasol',
        cantidad: 30,
        costoUnitario: 24,
        subtotal: 720,
      },
    ],
    total: 2370,
    pagado: 2370,
    saldo: 0,
    estado: 'Pagado',
    compradorNombre: 'Supervisor de Compras',
    observaciones: 'Mercadería recibida en almacén central. Calidad A1.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'pur_102',
    purchaseNumber: 2,
    proveedor: 'Distribuidora Papel & Embalajes El Alto',
    telefonoProveedor: '+591 79988776',
    numeroFacturaRecibo: 'NF-1092',
    metodoPago: 'Transferencia',
    fechaCompra: new Date(Date.now() - 3600000 * 12).toISOString(),
    productos: [
      {
        id: 'pitem_3',
        nombre: 'Bolsas de Embalaje de Burbuja y Cajas Kawaii',
        categoria: 'Insumos / Embalaje',
        variante: 'Paquete de 100 unidades',
        cantidad: 5,
        costoUnitario: 80,
        subtotal: 400,
      },
      {
        id: 'pitem_4',
        nombre: 'Estuches Cartucheras Anime 3D Multidiseño',
        categoria: 'Papelería',
        variante: 'Caja x24 unidades',
        cantidad: 2,
        costoUnitario: 420,
        subtotal: 840,
      },
    ],
    total: 1240,
    pagado: 800,
    saldo: 440,
    estado: 'Saldo Pendiente',
    compradorNombre: 'Supervisor de Compras',
    observaciones: 'Se dio anticipo de 800 Bs. Saldo restante de 440 Bs a pagar al recibir el segundo lote.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord_101',
    orderNumber: 1,
    cliente: 'Camila Rodriguez',
    telefono: '+591 71234567',
    lugarEntrega: 'Teleférico Morado (Estación Prado) - La Paz',
    observaciones: 'Para regalo de cumpleaños con dedicatoria en papel tornasol.',
    productos: [
      {
        id: 'item_1',
        nombre: 'Mochila Temática Kuromi Gothic Lolita',
        variante: 'Morado / Grande (Incluye llavero)',
        cantidad: 1,
        precioUnitario: 180,
      },
      {
        id: 'item_2',
        nombre: 'Set Plumones Punta Pincel Pastel',
        variante: 'Caja 36 colores',
        cantidad: 1,
        precioUnitario: 45,
      },
    ],
    total: 225,
    pagado: 100,
    saldo: 125,
    estado: 'Abierto',
    vendedorNombre: 'Vendedor Principal',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    rawTranscription: 'Nuevo pedido de Camila Rodriguez, celular 71234567, quiere una mochila temática de Kuromi en color morado tamaño grande con llavero por 180 bolivianos y un set de plumones punta pincel pastel de 36 colores por 45. Entregar en Teleférico Morado Prado. Dejó 100 de anticipo.',
  },
  {
    id: 'ord_102',
    orderNumber: 2,
    cliente: 'Diego Mendoza',
    telefono: '+591 68765432',
    lugarEntrega: 'Envío a Domicilio - Cochabamba',
    observaciones: 'Confirmar comprobante de envío por WhatsApp al despachar.',
    productos: [
      {
        id: 'item_3',
        nombre: 'Mochila Escolar Stitch Espacial Impermeable',
        variante: 'Azul Eléctrico / 16 pulgadas',
        cantidad: 1,
        precioUnitario: 160,
      },
      {
        id: 'item_4',
        nombre: 'Estuche Cartuchera Triple Compartimento',
        variante: 'Diseño Anime Spiderman',
        cantidad: 2,
        precioUnitario: 35,
      },
    ],
    total: 230,
    pagado: 230,
    saldo: 0,
    estado: 'Entregado',
    vendedorNombre: 'Vendedor Principal',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    rawTranscription: 'Diego Mendoza pidió una mochila Stitch impermeable de 160 bolivianos y 2 cartucheras triples de 35 cada una. Celular 68765432. Envío a domicilio Cochabamba, pagó el total 230 completo.',
  },
];

// Subscribe to real-time orders from Firestore
export function subscribeToOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (err: any) => void
) {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(ordersRef, orderBy('orderNumber', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Order);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore orders subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time users from Firestore
export function subscribeToUsers(
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: any) => void
) {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), uid: docSnap.id } as AppUser);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore users subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time purchases from Firestore
export function subscribeToPurchases(
  onUpdate: (purchases: Purchase[]) => void,
  onError?: (err: any) => void
) {
  const purchasesRef = collection(db, PURCHASES_COLLECTION);
  const q = query(purchasesRef, orderBy('purchaseNumber', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const list: Purchase[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Purchase);
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Firestore purchases subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// Recursively remove `undefined` values from objects/arrays before writing to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return data;
}

// Save or create purchase in Firestore
export async function savePurchaseToFirestore(purchase: Purchase): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchase.id);
  const cleanData = sanitizeForFirestore(purchase);
  await setDoc(docRef, cleanData, { merge: true });
}

// Update purchase fields
export async function updatePurchaseInFirestore(
  purchaseId: string,
  updates: Partial<Purchase>
): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, cleanUpdates);
}

// Anular compra
export async function anularPurchaseInFirestore(
  purchaseId: string,
  anuladoPor: string,
  motivo: string
): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  await updateDoc(docRef, {
    estado: 'Anulado',
    anuladoPor,
    motivoAnulacion: motivo || 'Compra anulada',
    anuladoAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// Reactivar compra
export async function reactivarPurchaseInFirestore(
  purchaseId: string,
  purchaseTotal: number,
  purchasePagado: number
): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  const saldo = Math.max(0, purchaseTotal - purchasePagado);
  const estado: PurchaseStatus = saldo === 0 ? 'Pagado' : 'Saldo Pendiente';
  await updateDoc(docRef, {
    estado,
    anuladoPor: deleteField(),
    motivoAnulacion: deleteField(),
    anuladoAt: deleteField(),
    updatedAt: new Date().toISOString(),
  });
}

// Delete purchase permanently (Jefe only)
export async function deletePurchaseFromFirestore(purchaseId: string): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  await deleteDoc(docRef);
}

export function getNextPurchaseNumber(purchases: Purchase[]): number {
  if (!purchases || purchases.length === 0) return 1;
  const max = purchases.reduce((m, p) => Math.max(m, p.purchaseNumber || 0), 0);
  return max + 1;
}

// Quick complete balance for an order (sets pagado = total, saldo = 0)
export async function completeOrderBalanceInFirestore(orderId: string, orderTotal: number): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(docRef, {
    pagado: orderTotal,
    saldo: 0,
    updatedAt: new Date().toISOString(),
  });
}

// Quick complete balance for a purchase (sets pagado = total, saldo = 0, estado = 'Pagado')
export async function completePurchaseBalanceInFirestore(purchaseId: string, purchaseTotal: number): Promise<void> {
  const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
  await updateDoc(docRef, {
    pagado: purchaseTotal,
    saldo: 0,
    estado: 'Pagado',
    updatedAt: new Date().toISOString(),
  });
}

// Save or create order in Firestore
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, order.id);
  const cleanOrder = sanitizeForFirestore(order);
  await setDoc(docRef, cleanOrder, { merge: true });
}

// Mark order as delivered / shipped with dispatcher attribution
export async function markOrderAsDeliveredInFirestore(
  orderId: string,
  enviadoPorNombre: string,
  enviadoPorUid?: string
): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const nowIso = new Date().toISOString();
  await updateDoc(docRef, {
    estado: 'Entregado',
    enviadoPorNombre,
    enviadoPorUid: enviadoPorUid || '',
    despachadoPorNombre: enviadoPorNombre,
    despachadoPorUid: enviadoPorUid || '',
    fechaEnvio: nowIso,
    despachadoAt: nowIso,
    updatedAt: nowIso,
  });
}

// Reopen order back to open/pending shipping
export async function reopenOrderInFirestore(orderId: string): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const nowIso = new Date().toISOString();
  await updateDoc(docRef, {
    estado: 'Abierto',
    enviadoPorNombre: deleteField(),
    enviadoPorUid: deleteField(),
    despachadoPorNombre: deleteField(),
    despachadoPorUid: deleteField(),
    fechaEnvio: deleteField(),
    despachadoAt: deleteField(),
    updatedAt: nowIso,
  });
}

// Update order status or fields
export async function updateOrderInFirestore(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, cleanUpdates);
}

// Anular venta (sellers can anular with reason, not permanently delete)
export async function anularOrderInFirestore(
  orderId: string,
  anuladoPor: string,
  motivo: string
): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(docRef, {
    estado: 'Anulado',
    anuladoPor,
    motivoAnulacion: motivo || 'Venta anulada por vendedor',
    anuladoAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// Delete order permanently (Jefe/Admin only)
export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await deleteDoc(docRef);
}

// Delete user permanently (Jefe/Admin only)
export async function deleteUserFromFirestore(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(docRef);
}

// Update user role or status (Jefe only)
export async function updateUserInFirestore(
  uid: string,
  updates: Partial<AppUser>
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const cleanUpdates = sanitizeForFirestore(updates);
  await updateDoc(docRef, cleanUpdates);
}

export function getNextOrderNumber(orders: Order[]): number {
  if (!orders || orders.length === 0) return 1;
  const max = orders.reduce((m, o) => Math.max(m, o.orderNumber || 0), 0);
  return max + 1;
}

/**
 * Format currency strictly in Bolivianos (Bs.) with seamless decimal support
 */
export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `Bs. ${formatted}`;
}

/**
 * Clean & standardize Bolivian phone number with +591 code
 */
export function formatBoliviaPhone(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.startsWith('591')) {
    const local = digits.slice(3);
    return `+591 ${local}`;
  }

  if (digits.length === 8) {
    return `+591 ${digits}`;
  }

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  return `+591 ${digits}`;
}

/**
 * Clean phone number for WhatsApp wa.me direct URL with Bolivia country code 591
 */
export function formatBoliviaWhatsAppDigits(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('591')) {
    return digits;
  }

  if (digits.length === 8 || digits.length <= 9) {
    return `591${digits}`;
  }

  return digits;
}

export function generateWhatsAppReceiptText(order: Order): string {
  const dateStr = new Date(order.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const itemsList = order.productos
    .map((item, idx) => {
      const formatted = formatArticleItem(item);
      const subtotal = item.cantidad * item.precioUnitario;
      const puDetail = item.cantidad > 1 ? ` (${formatCurrency(item.precioUnitario)} c/u)` : '';
      return `${idx + 1}. *${formatted}*\n   ↳ Subtotal: ${formatCurrency(subtotal)}${puDetail}`;
    })
    .join('\n');

  const paymentStatus =
    order.estado === 'Anulado'
      ? '🚫 *VENTA ANULADA*'
      : order.saldo <= 0
      ? '✅ *PAGADO COMPLETO*'
      : `⚠️ *SALDO PENDIENTE:* ${formatCurrency(order.saldo)}`;

  let msg = `✨ *CONFIRMACIÓN DE PEDIDO - IMPORTADORA CHIQUIMINISOS* ✨\n`;
  msg += `*Papelería y artículos Kawaii* 💖✏️\n`;
  msg += `─────────────────────────\n`;
  msg += `📦 *Pedido:* #${String(order.orderNumber).padStart(3, '0')}\n`;
  msg += `👤 *Cliente:* ${order.cliente || 'Sin nombre'}\n`;
  if (order.telefono) msg += `📱 *WhatsApp / Cel:* ${order.telefono}\n`;
  if (order.lugarEntrega) msg += `📍 *Lugar de Entrega:* ${order.lugarEntrega}\n`;
  if (order.vendedorNombre) msg += `🧑‍💼 *Venta registrada por:* ${order.vendedorNombre}\n`;
  if (order.enviadoPorNombre || order.despachadoPorNombre) {
    msg += `🚚 *Despachado / Enviado por:* ${order.enviadoPorNombre || order.despachadoPorNombre}\n`;
  }
  msg += `📅 *Fecha:* ${dateStr}\n`;
  msg += `📌 *Estado:* ${order.estado}\n`;
  msg += `─────────────────────────\n`;
  msg += `🛍️ *PRODUCTOS:*\n${itemsList}\n`;
  msg += `─────────────────────────\n`;
  msg += `💵 *Total:* ${formatCurrency(order.total)}\n`;
  msg += `💳 *Abonado / Pagado:* ${formatCurrency(order.pagado)}\n`;
  msg += `${paymentStatus}\n`;

  if (order.observaciones && order.observaciones.trim()) {
    msg += `─────────────────────────\n`;
    msg += `📝 *Observaciones:* ${order.observaciones.trim()}\n`;
  }

  msg += `─────────────────────────\n`;
  msg += `¡Muchas gracias por tu compra en Importadora Chiquiminisos! Ante cualquier duda escríbenos a este chat. 🎒✨🇧🇴`;

  return msg;
}

export function getWhatsAppUrl(order: Order): string {
  const cleanPhone = formatBoliviaWhatsAppDigits(order.telefono || '');
  const text = encodeURIComponent(generateWhatsAppReceiptText(order));
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

/**
 * Generates structured warehouse / dispatch preparation text for WhatsApp group
 */
export function generateWhatsAppPreparationText(order: Order): string {
  const dateStr = new Date(order.createdAt).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalPiezas = order.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);

  const itemsList = order.productos
    .map((item) => {
      return `  ▫️ *${formatArticleItem(item)}*`;
    })
    .join('\n');

  const paymentAlert =
    order.saldo <= 0
      ? '🟢 *PAGADO 100%* (Solo despachar)'
      : `🔴 *COBRAR EN DESTINO:* ${formatCurrency(order.saldo)}`;

  let msg = `📦 *FICHA DE PREPARACIÓN Y EMPAQUE* 📦\n`;
  msg += `🏷️ *PEDIDO #${String(order.orderNumber).padStart(3, '0')}*\n`;
  msg += `─────────────────────────\n`;
  msg += `👤 *Cliente:* ${order.cliente || 'Sin nombre'}\n`;
  if (order.telefono) msg += `📱 *Teléfono:* ${order.telefono}\n`;
  msg += `📍 *Destino / Envío:* ${order.lugarEntrega || 'Mostrador / Por coordinar'}\n`;
  if (order.vendedorNombre) msg += `🧑‍💼 *Venta registrada por:* ${order.vendedorNombre}\n`;
  if (order.enviadoPorNombre || order.despachadoPorNombre) {
    msg += `🚚 *Despachado por:* ${order.enviadoPorNombre || order.despachadoPorNombre}\n`;
  }
  msg += `⏰ *Fecha:* ${dateStr}\n`;
  msg += `─────────────────────────\n`;
  msg += `📋 *ARTÍCULOS A PREPARAR (${totalPiezas} piezas en total):*\n`;
  msg += `${itemsList}\n`;
  msg += `─────────────────────────\n`;
  msg += `💰 *COBRO:* ${paymentAlert}\n`;
  if (order.observaciones && order.observaciones.trim()) {
    msg += `📝 *Nota especial:* ${order.observaciones.trim()}\n`;
  }
  msg += `─────────────────────────\n`;
  msg += `⚠️ *Por favor armar el paquete y confirmar en el grupo cuando esté embalado listo para salida.* ✨`;

  return msg;
}

