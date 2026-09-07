import * as XLSX from 'xlsx';
import {
  fetchAllOrdersForBackup,
  fetchAllPurchasesForBackup,
  fetchAllUsersForBackup,
  formatCurrency,
  formatBoliviaPhone,
  formatArticleItem,
} from './storage';
import { Order, Purchase, AppUser } from '../types';

export interface BackupResult {
  success: boolean;
  filename: string;
  ordersCount: number;
  purchasesCount: number;
  clientsCount: number;
  usersCount: number;
  itemsCount: number;
}

/**
 * Formats a Date object to YYYY-MM-DD_HHmm for backup filenames
 */
export function getBackupTimestampString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}h${minutes}`;
}

/**
 * Human-readable date-time formatter
 */
function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 1. BACKUP COMPLETO (Excel .xlsx)
 * Exports ALL data from the system:
 * - Ventas (Pedidos)
 * - Artículos Desglosados de Ventas
 * - Compras a Proveedores
 * - Artículos Desglosados de Compras
 * - Clientes Consolidados (Directorio y métricas de consumo)
 * - Envíos y Despachos Logísticos
 * - Usuarios y Personal del Sistema
 *
 * Sin importar filtros de fecha, con fecha del respaldo en el nombre del archivo.
 */
export async function downloadFullSystemBackupExcel(): Promise<BackupResult> {
  const [orders, purchases, users] = await Promise.all([
    fetchAllOrdersForBackup(),
    fetchAllPurchasesForBackup(),
    fetchAllUsersForBackup(),
  ]);

  const timestamp = getBackupTimestampString();
  const filename = `Backup_Completo_Chiquiminisos_${timestamp}.xlsx`;

  // 1. Sheet: Ventas
  const salesRows = orders.map((o) => ({
    'Nº Venta': `#${String(o.orderNumber).padStart(3, '0')}`,
    'Fecha Registro': formatDateTime(o.createdAt),
    'Cliente': o.cliente || 'Sin nombre',
    'Teléfono': formatBoliviaPhone(o.telefono || ''),
    'Destino / Entrega': o.lugarEntrega || 'Mostrador / Por coordinar',
    'Total (Bs.)': Number(o.total || 0),
    'Abonado (Bs.)': Number(o.pagado || 0),
    'Saldo (Bs.)': Number(o.saldo || 0),
    'Estado Pedido': o.estado,
    'Estado Pago': (o.saldo || 0) <= 0 ? 'Pagado Completo' : 'Saldo Pendiente',
    'Vendedor/a': o.vendedorNombre || '-',
    'Despachado Por': o.enviadoPorNombre || o.despachadoPorNombre || '-',
    'Fecha Envío': formatDateTime(o.fechaEnvio || o.despachadoAt),
    'Archivado': o.archivado ? 'Sí (Archivado)' : 'No (Activo)',
    'Fecha Archivado': formatDateTime(o.fechaArchivado),
    'Observaciones': o.observaciones || '',
    'ID Firestore': o.id,
  }));

  // 2. Sheet: Detalle_Artículos_Ventas
  let totalSalesItems = 0;
  const salesItemsRows: any[] = [];
  orders.forEach((o) => {
    (o.productos || []).forEach((item, idx) => {
      totalSalesItems += item.cantidad || 0;
      salesItemsRows.push({
        'Nº Venta': `#${String(o.orderNumber).padStart(3, '0')}`,
        'Item #': idx + 1,
        'Fecha': formatDateTime(o.createdAt),
        'Cliente': o.cliente,
        'Producto': item.nombre,
        'Variante': item.variante || 'Estándar',
        'Cantidad (Pzas)': item.cantidad,
        'Precio Unitario (Bs.)': Number(item.precioUnitario || 0),
        'Subtotal (Bs.)': Number((item.cantidad || 0) * (item.precioUnitario || 0)),
        'Formato Empaque': formatArticleItem(item),
      });
    });
  });

  // 3. Sheet: Compras
  const purchasesRows = purchases.map((p) => ({
    'Nº Compra': `#C-${String(p.purchaseNumber).padStart(3, '0')}`,
    'Fecha Compra': formatDateTime(p.fechaCompra || p.createdAt),
    'Proveedor': p.proveedor || '-',
    'Teléfono Proveedor': formatBoliviaPhone(p.telefonoProveedor || ''),
    'Factura / Recibo': p.numeroFacturaRecibo || '-',
    'Método Pago': p.metodoPago || '-',
    'Total (Bs.)': Number(p.total || 0),
    'Pagado (Bs.)': Number(p.pagado || 0),
    'Saldo (Bs.)': Number(p.saldo || 0),
    'Estado Compra': p.estado,
    'Registrado Por': p.compradorNombre || '-',
    'Archivado': p.archivado ? 'Sí (Archivado)' : 'No (Activo)',
    'Fecha Archivado': formatDateTime(p.fechaArchivado),
    'Observaciones': p.observaciones || '',
    'ID Firestore': p.id,
  }));

  // 4. Sheet: Detalle_Artículos_Compras
  const purchasesItemsRows: any[] = [];
  purchases.forEach((p) => {
    (p.productos || []).forEach((item, idx) => {
      purchasesItemsRows.push({
        'Nº Compra': `#C-${String(p.purchaseNumber).padStart(3, '0')}`,
        'Item #': idx + 1,
        'Fecha': formatDateTime(p.fechaCompra || p.createdAt),
        'Proveedor': p.proveedor,
        'Producto': item.nombre,
        'Categoría': item.categoria || 'Papelería Kawaii',
        'Variante': item.variante || 'Surtido',
        'Cantidad (Pzas)': item.cantidad,
        'Costo Unitario (Bs.)': Number(item.costoUnitario || 0),
        'Subtotal (Bs.)': Number(item.subtotal || (item.cantidad * item.costoUnitario)),
      });
    });
  });

  // 5. Sheet: Clientes (Consolidación)
  const clientMap = new Map<string, {
    nombre: string;
    telefono: string;
    pedidosCount: number;
    totalGastado: number;
    saldoPendienteTotal: number;
    ultimaCompra: string;
  }>();

  orders.forEach((o) => {
    const key = (o.cliente || 'Sin Nombre').trim().toLowerCase();
    const existing = clientMap.get(key) || {
      nombre: o.cliente || 'Sin Nombre',
      telefono: o.telefono || '',
      pedidosCount: 0,
      totalGastado: 0,
      saldoPendienteTotal: 0,
      ultimaCompra: o.createdAt,
    };

    existing.pedidosCount += 1;
    existing.totalGastado += Number(o.total || 0);
    existing.saldoPendienteTotal += Math.max(0, Number(o.saldo || 0));
    if (o.telefono && !existing.telefono) existing.telefono = o.telefono;
    if (new Date(o.createdAt).getTime() > new Date(existing.ultimaCompra).getTime()) {
      existing.ultimaCompra = o.createdAt;
    }
    clientMap.set(key, existing);
  });

  const clientsRows = Array.from(clientMap.values())
    .sort((a, b) => b.totalGastado - a.totalGastado)
    .map((c) => ({
      'Cliente': c.nombre,
      'Teléfono / WhatsApp': formatBoliviaPhone(c.telefono),
      'Pedidos Totales': c.pedidosCount,
      'Monto Total Comprado (Bs.)': c.totalGastado,
      'Saldo Pendiente Actual (Bs.)': c.saldoPendienteTotal,
      'Última Compra': formatDateTime(c.ultimaCompra),
      'Estado Deuda': c.saldoPendienteTotal > 0 ? 'Con Deuda Pendiente' : 'Al Día',
    }));

  // 6. Sheet: Envíos_Despachos
  const shipmentsRows = orders.map((o) => {
    let estadoEnvio = 'Listo para Despacho';
    if (o.estado === 'Anulado') estadoEnvio = 'Anulado';
    else if (o.estado === 'Entregado') estadoEnvio = 'Entregado';
    else if (o.enviadoPorNombre || o.despachadoPorNombre) estadoEnvio = 'En Camino / Enviado';

    return {
      'Nº Venta': `#${String(o.orderNumber).padStart(3, '0')}`,
      'Fecha Venta': formatDateTime(o.createdAt),
      'Cliente': o.cliente,
      'Teléfono': formatBoliviaPhone(o.telefono || ''),
      'Destino / Lugar de Entrega': o.lugarEntrega,
      'Estado Envío': estadoEnvio,
      'Cobro en Destino (Saldo)': Number(o.saldo || 0),
      'Transportista / Despachado Por': o.enviadoPorNombre || o.despachadoPorNombre || 'Sin asignar',
      'Fecha Despacho': formatDateTime(o.fechaEnvio || o.despachadoAt),
      'Artículos (Total Pzas)': (o.productos || []).reduce((acc, p) => acc + (p.cantidad || 0), 0),
      'Nota / Observación': o.observaciones || '',
    };
  });

  // 7. Sheet: Usuarios_Personal
  const usersRows = users.map((u) => ({
    'Nombre Completo': u.displayName,
    'Correo de Acceso': u.email,
    'Rol Asignado':
      u.role === 'jefe'
        ? '👑 Jefa / Admin'
        : u.role === 'supervisor'
        ? '📊 Supervisora'
        : u.role === 'comprador'
        ? '🛒 Compradora'
        : '💼 Vendedora',
    'Estado Cuenta': u.disabled ? 'Desactivado' : 'Activo',
    'Fecha Creación': formatDateTime(u.createdAt),
    'UID': u.uid,
  }));

  // Create Excel workbook
  const wb = XLSX.utils.book_new();

  const wsVentas = XLSX.utils.json_to_sheet(salesRows);
  const wsVentasArticulos = XLSX.utils.json_to_sheet(salesItemsRows);
  const wsCompras = XLSX.utils.json_to_sheet(purchasesRows);
  const wsComprasArticulos = XLSX.utils.json_to_sheet(purchasesItemsRows);
  const wsClientes = XLSX.utils.json_to_sheet(clientsRows);
  const wsEnvios = XLSX.utils.json_to_sheet(shipmentsRows);
  const wsUsuarios = XLSX.utils.json_to_sheet(usersRows);

  XLSX.utils.book_append_sheet(wb, wsVentas, '1. Ventas');
  XLSX.utils.book_append_sheet(wb, wsVentasArticulos, '2. Artículos Ventas');
  XLSX.utils.book_append_sheet(wb, wsCompras, '3. Compras');
  XLSX.utils.book_append_sheet(wb, wsComprasArticulos, '4. Artículos Compras');
  XLSX.utils.book_append_sheet(wb, wsClientes, '5. Clientes Consolidados');
  XLSX.utils.book_append_sheet(wb, wsEnvios, '6. Envíos y Logística');
  XLSX.utils.book_append_sheet(wb, wsUsuarios, '7. Personal y Cuentas');

  // Trigger file download in browser
  XLSX.writeFile(wb, filename);

  return {
    success: true,
    filename,
    ordersCount: orders.length,
    purchasesCount: purchases.length,
    clientsCount: clientMap.size,
    usersCount: users.length,
    itemsCount: totalSalesItems,
  };
}

/**
 * Generates and downloads Full Backup in standard UTF-8 CSV format
 */
export async function downloadFullSystemBackupCSV(): Promise<BackupResult> {
  const [orders, purchases, users] = await Promise.all([
    fetchAllOrdersForBackup(),
    fetchAllPurchasesForBackup(),
    fetchAllUsersForBackup(),
  ]);

  const timestamp = getBackupTimestampString();
  const filename = `Backup_Completo_Chiquiminisos_${timestamp}.csv`;

  // Master CSV content with clear section demarcations
  let csv = `\uFEFF`; // UTF-8 BOM for Microsoft Excel compatibility
  csv += `# BACKUP COMPLETO DEL SISTEMA - IMPORTADORA CHIQUIMINISOS\n`;
  csv += `# FECHA DE GENERACIÓN: ${new Date().toLocaleString('es-BO')}\n`;
  csv += `# TOTAL VENTAS: ${orders.length} | TOTAL COMPRAS: ${purchases.length} | TOTAL USUARIOS: ${users.length}\n\n`;

  // Section 1: Ventas
  csv += `### SECCIÓN: VENTAS Y PEDIDOS\n`;
  csv += `Nº Venta,Fecha,Cliente,Teléfono,Destino,Total Bs,Abonado Bs,Saldo Bs,Estado Pedido,Estado Pago,Vendedor,Despachado Por,Archivado,Observaciones\n`;
  orders.forEach((o) => {
    const row = [
      `"#${o.orderNumber}"`,
      `"${formatDateTime(o.createdAt)}"`,
      `"${(o.cliente || '').replace(/"/g, '""')}"`,
      `"${formatBoliviaPhone(o.telefono || '')}"`,
      `"${(o.lugarEntrega || '').replace(/"/g, '""')}"`,
      o.total,
      o.pagado,
      o.saldo,
      `"${o.estado}"`,
      `"${o.saldo <= 0 ? 'Pagado' : 'Pendiente'}"`,
      `"${(o.vendedorNombre || '').replace(/"/g, '""')}"`,
      `"${(o.enviadoPorNombre || o.despachadoPorNombre || '').replace(/"/g, '""')}"`,
      `"${o.archivado ? 'Archivado' : 'Activo'}"`,
      `"${(o.observaciones || '').replace(/"/g, '""')}"`,
    ];
    csv += row.join(',') + '\n';
  });

  csv += `\n### SECCIÓN: COMPRAS A PROVEEDORES\n`;
  csv += `Nº Compra,Fecha,Proveedor,Teléfono,Factura/Recibo,Método Pago,Total Bs,Pagado Bs,Saldo Bs,Estado,Comprador,Archivado,Observaciones\n`;
  purchases.forEach((p) => {
    const row = [
      `"#C-${p.purchaseNumber}"`,
      `"${formatDateTime(p.fechaCompra || p.createdAt)}"`,
      `"${(p.proveedor || '').replace(/"/g, '""')}"`,
      `"${formatBoliviaPhone(p.telefonoProveedor || '')}"`,
      `"${(p.numeroFacturaRecibo || '').replace(/"/g, '""')}"`,
      `"${p.metodoPago || ''}"`,
      p.total,
      p.pagado,
      p.saldo,
      `"${p.estado}"`,
      `"${(p.compradorNombre || '').replace(/"/g, '""')}"`,
      `"${p.archivado ? 'Archivado' : 'Activo'}"`,
      `"${(p.observaciones || '').replace(/"/g, '""')}"`,
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename,
    ordersCount: orders.length,
    purchasesCount: purchases.length,
    clientsCount: 0,
    usersCount: users.length,
    itemsCount: 0,
  };
}
