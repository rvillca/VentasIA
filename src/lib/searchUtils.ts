import { Order, Purchase } from '../types';

/**
 * Evalúa si una orden coincide con el término de búsqueda de manera flexible y exhaustiva.
 * Resuelve búsquedas por:
 * - Número de pedido (ej: "165", "#165", "# 165", "N° 165", "No. 165", "pedido 165", "0165")
 * - Cliente (nombre completo o parcial)
 * - Teléfono (con o sin código de país, espacios, guiones)
 * - Lugar de entrega / Dirección / Destino
 * - Vendedor / Despachador / Enviado por
 * - Nombre de productos incluidos en el pedido
 * - Observaciones / Notas
 * - ID único de la orden
 */
export function matchesOrderSearch(order: Order | null | undefined, searchTerm: string): boolean {
  if (!order) return false;
  if (!searchTerm) return true;
  const raw = searchTerm.trim();
  if (!raw) return true;

  const term = raw.toLowerCase();

  // 1. Número de pedido (Order Number)
  if (order.orderNumber !== undefined && order.orderNumber !== null) {
    const numStr = String(order.orderNumber).trim();
    // Extraer solo dígitos de la búsqueda
    const searchDigits = raw.replace(/\D/g, '');

    // Comprobaciones directas
    if (numStr === raw || numStr.includes(term)) return true;
    if (`#${numStr}`.toLowerCase().includes(term)) return true;
    if (`# ${numStr}`.toLowerCase().includes(term)) return true;
    if (`n°${numStr}`.toLowerCase().includes(term)) return true;
    if (`no${numStr}`.toLowerCase().includes(term)) return true;
    if (`no.${numStr}`.toLowerCase().includes(term)) return true;
    if (`pedido ${numStr}`.toLowerCase().includes(term)) return true;
    if (`pedido #${numStr}`.toLowerCase().includes(term)) return true;

    // Si el usuario ingresó dígitos (ej: "#165", " 165 ", "pedido 165" -> searchDigits: "165")
    if (searchDigits) {
      if (numStr.includes(searchDigits)) return true;
      // Con ceros a la izquierda (ej: si busca "0165" o si orderNumber se busca con pad)
      if (numStr.padStart(3, '0').includes(searchDigits)) return true;
      if (numStr.padStart(4, '0').includes(searchDigits)) return true;
      if (String(parseInt(searchDigits, 10)) === numStr) return true;
    }
  }

  // 2. ID de documento Firestore
  if (order.id && order.id.toLowerCase().includes(term)) return true;

  // 3. Cliente
  if (order.cliente && order.cliente.toLowerCase().includes(term)) return true;
  if ((order as any).clienteNombre && (order as any).clienteNombre.toLowerCase().includes(term)) return true;

  // 4. Teléfono
  if (order.telefono && order.telefono.includes(term)) return true;
  const phoneDigits = (order.telefono || '').replace(/\D/g, '');
  const searchDigits = raw.replace(/\D/g, '');
  if (searchDigits.length >= 3 && phoneDigits.includes(searchDigits)) return true;

  // 5. Lugar de entrega / Destino
  if (order.lugarEntrega && order.lugarEntrega.toLowerCase().includes(term)) return true;
  if ((order as any).destino && (order as any).destino.toLowerCase().includes(term)) return true;

  // 6. Vendedor / Despachador / Enviado por
  if (order.vendedorNombre && order.vendedorNombre.toLowerCase().includes(term)) return true;
  if (order.enviadoPorNombre && order.enviadoPorNombre.toLowerCase().includes(term)) return true;
  if (order.despachadoPorNombre && order.despachadoPorNombre.toLowerCase().includes(term)) return true;

  // 7. Observaciones
  if (order.observaciones && order.observaciones.toLowerCase().includes(term)) return true;

  // 8. Productos
  if (
    order.productos &&
    order.productos.some((p) => p && p.nombre && p.nombre.toLowerCase().includes(term))
  ) {
    return true;
  }

  return false;
}

/**
 * Evalúa si una compra coincide con el término de búsqueda.
 */
export function matchesPurchaseSearch(purchase: Purchase | null | undefined, searchTerm: string): boolean {
  if (!purchase) return false;
  if (!searchTerm) return true;
  const raw = searchTerm.trim();
  if (!raw) return true;

  const term = raw.toLowerCase();

  // Número de compra
  if (purchase.purchaseNumber !== undefined && purchase.purchaseNumber !== null) {
    const numStr = String(purchase.purchaseNumber).trim();
    const searchDigits = raw.replace(/\D/g, '');
    if (numStr === raw || numStr.includes(term)) return true;
    if (`#${numStr}`.toLowerCase().includes(term)) return true;
    if (searchDigits && (numStr.includes(searchDigits) || String(parseInt(searchDigits, 10)) === numStr)) return true;
  }

  if (purchase.id && purchase.id.toLowerCase().includes(term)) return true;
  if (purchase.proveedor && purchase.proveedor.toLowerCase().includes(term)) return true;
  if (purchase.telefonoProveedor && purchase.telefonoProveedor.includes(term)) return true;
  if (purchase.numeroFacturaRecibo && purchase.numeroFacturaRecibo.toLowerCase().includes(term)) return true;
  if (purchase.compradorNombre && purchase.compradorNombre.toLowerCase().includes(term)) return true;
  if (purchase.observaciones && purchase.observaciones.toLowerCase().includes(term)) return true;

  if (
    purchase.productos &&
    purchase.productos.some((p) => p && p.nombre && p.nombre.toLowerCase().includes(term))
  ) {
    return true;
  }

  return false;
}
