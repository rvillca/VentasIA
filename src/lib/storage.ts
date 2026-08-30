import { Order } from '../types';

const STORAGE_KEY = 'ventasIA_orders_store_v2_bo';

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
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    rawTranscription: 'Diego Mendoza pidió una mochila Stitch impermeable de 160 bolivianos y 2 cartucheras triples de 35 cada una. Celular 68765432. Envío a domicilio Cochabamba, pagó el total 230 completo.',
  },
];

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_ORDERS));
      return INITIAL_SAMPLE_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SAMPLE_ORDERS;
  } catch (err) {
    console.error('Error reading localStorage orders:', err);
    return INITIAL_SAMPLE_ORDERS;
  }
}

export function saveOrdersToStorage(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Error writing orders to localStorage:', err);
  }
}

export function getNextOrderNumber(orders: Order[]): number {
  if (!orders || orders.length === 0) return 1;
  const max = orders.reduce((m, o) => Math.max(m, o.orderNumber || 0), 0);
  return max + 1;
}

/**
 * Format currency strictly in Bolivianos (Bs.)
 */
export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
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

  // If already starts with 591
  if (digits.startsWith('591')) {
    const local = digits.slice(3);
    return `+591 ${local}`;
  }

  // 8 digit Bolivian mobile / phone (7XXXXXXX, 6XXXXXXX, 2XXXXXXX, etc.)
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

  // If 8-digit Bolivian number, prepend 591
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
      const variantText = item.variante ? ` (${item.variante})` : '';
      const subtotal = item.cantidad * item.precioUnitario;
      return `${idx + 1}. *${item.cantidad}x* ${item.nombre}${variantText}\n   ↳ Subtotal: ${formatCurrency(subtotal)} (${formatCurrency(item.precioUnitario)} c/u)`;
    })
    .join('\n');

  const paymentStatus =
    order.saldo <= 0
      ? '✅ *PAGADO COMPLETO*'
      : `⚠️ *SALDO PENDIENTE:* ${formatCurrency(order.saldo)}`;

  let msg = `✨ *CONFIRMACIÓN DE PEDIDO - TIENDA TIKTOK* ✨\n`;
  msg += `─────────────────────────\n`;
  msg += `📦 *Pedido:* #${String(order.orderNumber).padStart(3, '0')}\n`;
  msg += `👤 *Cliente:* ${order.cliente || 'Sin nombre'}\n`;
  if (order.telefono) msg += `📱 *WhatsApp / Cel:* ${order.telefono}\n`;
  if (order.lugarEntrega) msg += `📍 *Lugar de Entrega:* ${order.lugarEntrega}\n`;
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
  msg += `¡Muchas gracias por tu compra en Bolivia! Ante cualquier duda escríbenos a este chat. 🎒✏️🇧🇴`;

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
