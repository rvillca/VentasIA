import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  Users,
  Award,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  TrendingDown,
  Scale,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  MapPin,
  Clock,
  Search,
  Check,
  UserCheck,
} from 'lucide-react';
import { Order, Purchase } from '../types';
import { formatCurrency, formatBoliviaPhone, formatArticleItem } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface ReportsScreenProps {
  orders: Order[];
  purchases?: Purchase[];
}

type DateRangeFilter = 'today' | '7days' | '30days' | 'this_month' | 'all';
type ReportViewType = 'ventas' | 'envios' | 'compras' | 'balance';

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ orders, purchases = [] }) => {
  const { isComprador, isJefe, isSupervisor } = useAuth();
  const { isDark } = useTheme();
  const [activeReportView, setActiveReportView] = useState<ReportViewType>(
    isComprador ? 'compras' : 'ventas'
  );
  const [range, setRange] = useState<DateRangeFilter>('7days');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [shippingShipperFilter, setShippingShipperFilter] = useState<string>('all');
  const [shippingSellerFilter, setShippingSellerFilter] = useState<string>('all');
  const [shippingStatusFilter, setShippingStatusFilter] = useState<string>('all');
  const [shippingSearch, setShippingSearch] = useState<string>('');

  // Filter orders by date range and seller
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      let matchDate = true;

      if (range === 'today') {
        matchDate = orderDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past30;
      } else if (range === 'this_month') {
        matchDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      }

      const matchSeller =
        selectedSeller === 'all' ||
        (order.vendedorNombre || 'Sin asignar') === selectedSeller;

      return matchDate && matchSeller;
    });
  }, [orders, range, selectedSeller]);

  // Shipping specific filtered orders
  const filteredShippingOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      let matchDate = true;

      if (range === 'today') {
        matchDate = orderDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past30;
      } else if (range === 'this_month') {
        matchDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      }

      const actualShipper =
        order.enviadoPorNombre || order.despachadoPorNombre || (order.estado === 'Entregado' ? order.vendedorNombre : '');

      const matchShipper =
        shippingShipperFilter === 'all' ||
        (actualShipper || 'Sin asignar') === shippingShipperFilter;

      const matchSeller =
        shippingSellerFilter === 'all' ||
        (order.vendedorNombre || 'Sin asignar') === shippingSellerFilter;

      const matchStatus =
        shippingStatusFilter === 'all' || order.estado === shippingStatusFilter;

      let matchSearch = true;
      if (shippingSearch.trim()) {
        const term = shippingSearch.toLowerCase();
        matchSearch =
          order.cliente.toLowerCase().includes(term) ||
          order.lugarEntrega.toLowerCase().includes(term) ||
          order.telefono.includes(term) ||
          `#${order.orderNumber}`.includes(term) ||
          (order.vendedorNombre && order.vendedorNombre.toLowerCase().includes(term)) ||
          (order.enviadoPorNombre && order.enviadoPorNombre.toLowerCase().includes(term)) ||
          (order.despachadoPorNombre && order.despachadoPorNombre.toLowerCase().includes(term));
      }

      return matchDate && matchShipper && matchSeller && matchStatus && matchSearch;
    });
  }, [orders, range, shippingShipperFilter, shippingSellerFilter, shippingStatusFilter, shippingSearch]);

  // Filter purchases by date range
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      const pDate = new Date(p.fechaCompra || p.createdAt);
      let matchDate = true;

      if (range === 'today') {
        matchDate = pDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = pDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = pDate >= past30;
      } else if (range === 'this_month') {
        matchDate =
          pDate.getMonth() === now.getMonth() &&
          pDate.getFullYear() === now.getFullYear();
      }

      const matchSupplier =
        selectedSupplier === 'all' ||
        (p.proveedor || 'Sin especificar') === selectedSupplier;

      return matchDate && matchSupplier;
    });
  }, [purchases, range, selectedSupplier]);

  // Unique list of sellers
  const allSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.vendedorNombre) set.add(o.vendedorNombre);
    });
    return Array.from(set);
  }, [orders]);

  // Unique list of shippers (who actually marked delivered / dispatched)
  const allShippers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.enviadoPorNombre) set.add(o.enviadoPorNombre);
      if (o.despachadoPorNombre) set.add(o.despachadoPorNombre);
      if (o.estado === 'Entregado' && o.vendedorNombre) set.add(o.vendedorNombre);
    });
    return Array.from(set);
  }, [orders]);

  // Unique list of suppliers
  const allSuppliers = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => {
      if (p.proveedor) set.add(p.proveedor);
    });
    return Array.from(set);
  }, [purchases]);

  // Calculations for Sales (excluding Anulado from totals)
  const validOrders = useMemo(
    () => filteredOrders.filter((o) => o.estado !== 'Anulado'),
    [filteredOrders]
  );
  const canceledOrders = useMemo(
    () => filteredOrders.filter((o) => o.estado === 'Anulado'),
    [filteredOrders]
  );

  const totalVendido = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = validOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = validOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);
  const totalAnulado = canceledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const ticketPromedio = validOrders.length > 0 ? totalVendido / validOrders.length : 0;

  // Shipping metrics
  const shippingTotalCount = filteredShippingOrders.length;
  const shippingDelivered = filteredShippingOrders.filter((o) => o.estado === 'Entregado');
  const shippingPending = filteredShippingOrders.filter((o) => o.estado === 'Abierto');
  const shippingCanceled = filteredShippingOrders.filter((o) => o.estado === 'Anulado');
  const shippingSuccessRate =
    shippingTotalCount > 0 ? Math.round((shippingDelivered.length / shippingTotalCount) * 100) : 0;
  const shippingPendingBalance = shippingPending.reduce((sum, o) => sum + Math.max(0, o.saldo || 0), 0);

  // Shipping by Shipper (Quién realizó el despacho / envío físicamente)
  const shippingByShipper = useMemo(() => {
    const map: Record<string, { total: number; entregados: number; abiertos: number; anulados: number; montoEntregado: number }> = {};
    filteredShippingOrders.forEach((o) => {
      const shipper = o.estado === 'Entregado'
        ? (o.enviadoPorNombre || o.despachadoPorNombre || o.vendedorNombre || 'Sin especificar')
        : (o.vendedorNombre || 'En almacén');

      if (!map[shipper]) {
        map[shipper] = { total: 0, entregados: 0, abiertos: 0, anulados: 0, montoEntregado: 0 };
      }
      map[shipper].total += 1;
      if (o.estado === 'Entregado') {
        map[shipper].entregados += 1;
        map[shipper].montoEntregado += o.total || 0;
      } else if (o.estado === 'Abierto') {
        map[shipper].abiertos += 1;
      } else if (o.estado === 'Anulado') {
        map[shipper].anulados += 1;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.entregados - a.entregados || b.total - a.total);
  }, [filteredShippingOrders]);

  // Shipping by Seller (Quién registró la venta originaria)
  const shippingBySeller = useMemo(() => {
    const map: Record<string, { total: number; entregados: number; abiertos: number; anulados: number; montoTotal: number }> = {};
    filteredShippingOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      if (!map[seller]) {
        map[seller] = { total: 0, entregados: 0, abiertos: 0, anulados: 0, montoTotal: 0 };
      }
      map[seller].total += 1;
      if (o.estado === 'Entregado') map[seller].entregados += 1;
      else if (o.estado === 'Abierto') map[seller].abiertos += 1;
      else if (o.estado === 'Anulado') map[seller].anulados += 1;
      map[seller].montoTotal += o.total || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredShippingOrders]);

  // Shipping by Destination breakdown
  const shippingByDestination = useMemo(() => {
    const map: Record<string, number> = {};
    filteredShippingOrders.forEach((o) => {
      const dest = o.lugarEntrega?.trim() || 'Sin especificar';
      map[dest] = (map[dest] || 0) + 1;
    });
    return Object.entries(map)
      .map(([dest, count]) => ({ dest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredShippingOrders]);

  // Calculations for Purchases (excluding Anulado)
  const validPurchases = useMemo(
    () => filteredPurchases.filter((p) => p.estado !== 'Anulado'),
    [filteredPurchases]
  );
  const totalInvertido = validPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagadoCompras = validPurchases.reduce((sum, p) => sum + (p.pagado || 0), 0);
  const totalDeudaProveedores = validPurchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
  const compraPromedio = validPurchases.length > 0 ? totalInvertido / validPurchases.length : 0;

  // Balance calculations
  const flujoCajaNeto = totalCobrado - totalPagadoCompras;
  const margenBrutoTeorico = totalVendido - totalInvertido;

  // Seller Performance Ranking
  const sellerPerformance = useMemo(() => {
    const map: Record<string, { count: number; total: number; cobrado: number }> = {};
    validOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      if (!map[seller]) {
        map[seller] = { count: 0, total: 0, cobrado: 0 };
      }
      map[seller].count += 1;
      map[seller].total += o.total || 0;
      map[seller].cobrado += o.pagado || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [validOrders]);

  // Supplier Performance Ranking
  const supplierPerformance = useMemo(() => {
    const map: Record<string, { count: number; total: number; pagado: number; saldo: number }> = {};
    validPurchases.forEach((p) => {
      const sup = p.proveedor || 'Sin especificar';
      if (!map[sup]) {
        map[sup] = { count: 0, total: 0, pagado: 0, saldo: 0 };
      }
      map[sup].count += 1;
      map[sup].total += p.total || 0;
      map[sup].pagado += p.pagado || 0;
      map[sup].saldo += p.saldo || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [validPurchases]);

  // Top Products Sold
  const topProductsSold = useMemo(() => {
    const map: Record<string, { cantidad: number; totalBs: number }> = {};
    validOrders.forEach((o) => {
      o.productos.forEach((p) => {
        const name = p.nombre.trim();
        if (!map[name]) {
          map[name] = { cantidad: 0, totalBs: 0 };
        }
        map[name].cantidad += p.cantidad || 1;
        map[name].totalBs += (p.cantidad || 1) * (p.precioUnitario || 0);
      });
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        cantidad: d.cantidad,
        totalBs: d.totalBs,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [validOrders]);

  // Top Materials Purchased
  const topMaterialsPurchased = useMemo(() => {
    const map: Record<string, { cantidad: number; totalBs: number }> = {};
    validPurchases.forEach((p) => {
      p.productos.forEach((prod) => {
        const name = prod.nombre.trim();
        if (!map[name]) {
          map[name] = { cantidad: 0, totalBs: 0 };
        }
        map[name].cantidad += prod.cantidad || 1;
        map[name].totalBs += (prod.cantidad || 1) * (prod.costoUnitario || 0);
      });
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        cantidad: d.cantidad,
        totalBs: d.totalBs,
      }))
      .sort((a, b) => b.totalBs - a.totalBs)
      .slice(0, 6);
  }, [validPurchases]);

  // Export CSV Report
  const handleExportCSV = () => {
    if (activeReportView === 'ventas') {
      let csv = 'Numero,Cliente,Telefono,Lugar,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Vendedor_Registro,Fecha_Venta\n';
      filteredOrders.forEach((o) => {
        const dateStr = new Date(o.createdAt).toLocaleDateString('es-BO');
        csv += `"${o.orderNumber}","${o.cliente.replace(/"/g, '""')}","${o.telefono}","${o.lugarEntrega.replace(/"/g, '""')}",${o.total},${o.pagado},${o.saldo},"${o.estado}","${o.vendedorNombre || ''}","${dateStr}"\n`;
      });
      downloadFile(csv, `reporte_ventas_${range}.csv`);
    } else if (activeReportView === 'envios') {
      let csv = 'Numero,Venta_Registrada_Por,Despachado_Por,Fecha_Venta,Fecha_Envio,Cliente,Telefono,Lugar_Entrega,Articulos,Total_Bs,Pagado_Bs,Saldo_Bs,Estado\n';
      filteredShippingOrders.forEach((o) => {
        const dateVenta = new Date(o.createdAt).toLocaleString('es-BO');
        const dateEnvio = o.fechaEnvio || (o.despachadoAt ? new Date(o.despachadoAt).toLocaleString('es-BO') : (o.estado === 'Entregado' ? dateVenta : 'Pendiente'));
        const despachadoPor = o.enviadoPorNombre || o.despachadoPorNombre || (o.estado === 'Entregado' ? (o.vendedorNombre || 'Despachado') : 'Pendiente');
        const itemsStr = (o.productos || []).map((p) => formatArticleItem(p)).join('; ');
        csv += `"${o.orderNumber}","${(o.vendedorNombre || 'Sin asignar').replace(/"/g, '""')}","${despachadoPor.replace(/"/g, '""')}","${dateVenta}","${dateEnvio}","${o.cliente.replace(/"/g, '""')}","${o.telefono}","${(o.lugarEntrega || '').replace(/"/g, '""')}","${itemsStr.replace(/"/g, '""')}",${o.total},${o.pagado},${o.saldo},"${o.estado}"\n`;
      });
      downloadFile(csv, `reporte_envios_${range}.csv`);
    } else if (activeReportView === 'compras') {
      let csv = 'Numero,Proveedor,Telefono,Comprobante,MetodoPago,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Comprador,Fecha\n';
      filteredPurchases.forEach((p) => {
        const dateStr = new Date(p.fechaCompra || p.createdAt).toLocaleDateString('es-BO');
        csv += `"#C-${String(p.purchaseNumber).padStart(3, '0')}","${p.proveedor.replace(/"/g, '""')}","${p.telefonoProveedor || ''}","${p.numeroFacturaRecibo || ''}","${p.metodoPago}",${p.total},${p.pagado},${p.saldo},"${p.estado}","${p.compradorNombre || ''}","${dateStr}"\n`;
      });
      downloadFile(csv, `reporte_compras_${range}.csv`);
    } else {
      let csv = 'Metrica,Monto_Bs\n';
      csv += `"Total Ventas",${totalVendido}\n`;
      csv += `"Ingreso Cobrado en Caja",${totalCobrado}\n`;
      csv += `"Total Inversion Compras",${totalInvertido}\n`;
      csv += `"Pagado a Proveedores",${totalPagadoCompras}\n`;
      csv += `"Flujo Neto de Caja",${flujoCajaNeto}\n`;
      csv += `"Margen Bruto Estimado",${margenBrutoTeorico}\n`;
      downloadFile(csv, `balance_general_${range}.csv`);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-dashboard-screen" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Header with Export & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20">
              Dashboard Analítico
            </span>
            <span className="text-xs text-[#78716C]">
              {isJefe ? '👑 Jefe / Admin' : isSupervisor ? '📊 Supervisor' : '🛒 Comprador'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight font-['Outfit',sans-serif] text-[#1A2B5C]">
            Reportes & Finanzas Chiquiminisos
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Métricas de Ventas, Envíos y Logística, Compras de Mercadería y Balance General.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-95 shadow-sm flex items-center justify-center gap-2 transition cursor-pointer bg-white hover:bg-[#F5EFE0] border border-[#E8DFC8] text-[#1A2B5C]"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Exportar Excel (CSV)</span>
        </button>
      </div>

      {/* Main View Switcher: Ventas vs Envíos vs Compras vs Balance */}
      {!isComprador && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border p-1.5 rounded-2xl bg-white border-[#E8DFC8]">
          <button
            type="button"
            onClick={() => setActiveReportView('ventas')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'ventas'
                ? 'bg-[#1A2B5C] text-white shadow-md font-black'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>1. Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('envios')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'envios'
                ? 'bg-[#1A2B5C] text-white shadow-md font-black'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <Truck className="w-4 h-4 text-amber-500" />
            <span>2. Envíos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('compras')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'compras'
                ? 'bg-amber-500 text-white shadow-md font-black'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>3. Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('balance')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'balance'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>4. Balance</span>
          </button>
        </div>
      )}

      {/* Filter Controls Bar (Period + Specific Filters) */}
      <div className="border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 bg-white border-[#E8DFC8]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === 'today'
                ? 'bg-[#1A2B5C] text-white font-black shadow-md'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Hoy (Diario)
          </button>

          <button
            type="button"
            onClick={() => setRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === '7days'
                ? 'bg-[#1A2B5C] text-white font-black shadow-md'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Últimos 7 Días (Semanal)
          </button>

          <button
            type="button"
            onClick={() => setRange('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === 'this_month'
                ? 'bg-[#1A2B5C] text-white font-black shadow-md'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Este Mes (Mensual)
          </button>

          <button
            type="button"
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === 'all'
                ? 'bg-[#1A2B5C] text-white font-black shadow-md'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Histórico Total
          </button>
        </div>

        {activeReportView === 'ventas' && allSellers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#78716C]">Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
            >
              <option value="all">Todos los vendedores</option>
              {allSellers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeReportView === 'envios' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#78716C]">Despachó:</span>
              <select
                value={shippingShipperFilter}
                onChange={(e) => setShippingShipperFilter(e.target.value)}
                className="text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
              >
                <option value="all">Todos los despachadores</option>
                {allShippers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#78716C]">Vendedora:</span>
              <select
                value={shippingSellerFilter}
                onChange={(e) => setShippingSellerFilter(e.target.value)}
                className="text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
              >
                <option value="all">Todas las vendedoras</option>
                {allSellers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#78716C]">Estado:</span>
              <select
                value={shippingStatusFilter}
                onChange={(e) => setShippingStatusFilter(e.target.value)}
                className="text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
              >
                <option value="all">Todos los estados</option>
                <option value="Entregado">Entregados</option>
                <option value="Abierto">Pendientes / En Ruta</option>
                <option value="Anulado">Anulados</option>
              </select>
            </div>
          </div>
        )}

        {activeReportView === 'compras' && allSuppliers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#78716C]">Proveedor:</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
            >
              <option value="all">Todos los proveedores</option>
              {allSuppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: REPORTE DE VENTAS */}
      {activeReportView === 'ventas' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#78716C]">
                Total Ventas (Bs.)
              </span>
              <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                {formatCurrency(totalVendido)}
              </span>
              <span className="text-[11px] block mt-0.5 text-[#78716C]/80">
                {validOrders.length} pedidos efectivos
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Cobrado en Caja (QR / Ef.)
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif]">
                {formatCurrency(totalCobrado)}
              </span>
              <span className="text-[11px] text-emerald-700/80 block mt-0.5">
                Ingreso real recibido
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-amber-200">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Saldos por Cobrar
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-['Outfit',sans-serif]">
                {formatCurrency(totalPorCobrar)}
              </span>
              <span className="text-[11px] text-amber-700/80 block mt-0.5">
                Pendientes de cobro
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#1A2B5C]">
                Ticket Promedio
              </span>
              <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                {formatCurrency(ticketPromedio)}
              </span>
              <span className="text-[11px] block mt-0.5 text-[#78716C]/80">
                Promedio por cliente
              </span>
            </div>
          </div>

          {/* Ventas Anuladas KPI if any */}
          {totalAnulado > 0 && (
            <div className="p-3.5 border rounded-2xl flex items-center justify-between text-xs bg-rose-50 border-rose-200 text-rose-800">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  <strong>Ventas Anuladas:</strong> {canceledOrders.length} pedido(s) anulado(s) por un valor de {formatCurrency(totalAnulado)}.
                </span>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sales by Seller Performance */}
            <div className="lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Rendimiento por Vendedor
                  </h2>
                </div>
                <span className="text-xs text-[#78716C]">Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {sellerPerformance.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin datos de ventas en este rango.
                  </p>
                ) : (
                  sellerPerformance.map((seller, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-[#1A2B5C]/10 text-[#1A2B5C]">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1A2B5C]">
                            {seller.name}
                          </h4>
                          <p className="text-[11px] text-[#78716C]">
                            {seller.count} {seller.count === 1 ? 'venta' : 'ventas'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black font-mono block text-[#1A2B5C]">
                          {formatCurrency(seller.total)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          Cobrado: {formatCurrency(seller.cobrado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 6 Best-selling Products */}
            <div className="lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#1A2B5C]" />
                  <h2 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Top Artículos Más Vendidos
                  </h2>
                </div>
                <span className="text-xs text-[#78716C]">Unidades vendidas</span>
              </div>

              <div className="space-y-3">
                {topProductsSold.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin productos en este rango.
                  </p>
                ) : (
                  topProductsSold.map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 bg-[#1A2B5C]/10 text-[#1A2B5C]">
                          {prod.cantidad}u
                        </span>
                        <span className="text-xs sm:text-sm font-bold truncate text-[#1A2B5C]">
                          {prod.name}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-black font-mono shrink-0 text-[#1A2B5C]">
                        {formatCurrency(prod.totalBs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REPORTE DE ENVÍOS & LOGÍSTICA (NUEVO) */}
      {activeReportView === 'envios' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Cards Grid for Envíos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#78716C]">
                Total Envíos Registrados
              </span>
              <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                {shippingTotalCount}
              </span>
              <span className="text-[11px] block mt-0.5 text-[#78716C]/80">
                En el periodo seleccionado
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Entregados con Éxito
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif]">
                {shippingDelivered.length} ({shippingSuccessRate}%)
              </span>
              <span className="text-[11px] text-emerald-700/80 block mt-0.5">
                Entregas efectivas completadas
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-amber-200">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Pendientes / En Ruta
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-['Outfit',sans-serif]">
                {shippingPending.length}
              </span>
              <span className="text-[11px] text-amber-700/80 block mt-0.5">
                Saldo pendiente: {formatCurrency(shippingPendingBalance)}
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-rose-200">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                Envíos Anulados
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-700 font-['Outfit',sans-serif]">
                {shippingCanceled.length}
              </span>
              <span className="text-[11px] text-rose-700/80 block mt-0.5">
                Cancelados o no concretados
              </span>
            </div>
          </div>

          {/* Quick Stats: Breakdown by Shipper (Quién realizó el despacho) & Sellers & Destination */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Despachadores Ranking (Quién entregó/despachó) */}
            <div className="lg:col-span-4 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm sm:text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Despachos por Persona
                  </h2>
                </div>
                <span className="text-[11px] text-[#78716C]">Quién envió</span>
              </div>

              <div className="space-y-3">
                {shippingByShipper.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin registros de envíos en este rango.
                  </p>
                ) : (
                  shippingByShipper.map((userStat, idx) => {
                    const userDeliveredPct =
                      userStat.total > 0 ? Math.round((userStat.entregados / userStat.total) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-[#1A2B5C]/10 text-[#1A2B5C]">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-[#1A2B5C]">{userStat.name}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                              <span className="text-emerald-700 font-semibold">{userStat.entregados} entregados</span>
                              {userStat.abiertos > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-semibold">{userStat.abiertos} en ruta</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-black font-mono block text-[#1A2B5C]">
                            {userStat.entregados} env.
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            {userDeliveredPct}% entregado
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Vendedoras Ranking (Quién originó la venta) */}
            <div className="lg:col-span-4 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#1A2B5C]" />
                  <h2 className="text-sm sm:text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Ventas Registradas
                  </h2>
                </div>
                <span className="text-[11px] text-[#78716C]">Quién vendió</span>
              </div>

              <div className="space-y-3">
                {shippingBySeller.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin registros de ventas en este rango.
                  </p>
                ) : (
                  shippingBySeller.map((userStat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-amber-500/10 text-amber-900">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A2B5C]">{userStat.name}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                            <span className="text-emerald-700 font-semibold">{userStat.entregados} ent.</span>
                            <span>•</span>
                            <span className="text-amber-700 font-semibold">{userStat.abiertos} pend.</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black font-mono block text-[#1A2B5C]">
                          {userStat.total} ped.
                        </span>
                        <span className="text-[10px] text-[#78716C] font-mono">
                          {formatCurrency(userStat.montoTotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Destinos / Lugares de Entrega */}
            <div className="lg:col-span-4 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm sm:text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Top Destinos
                  </h2>
                </div>
                <span className="text-[11px] text-[#78716C]">Frecuencia</span>
              </div>

              <div className="space-y-3">
                {shippingByDestination.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin registros de destinos en este rango.
                  </p>
                ) : (
                  shippingByDestination.map((dest, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 bg-amber-100 text-amber-800">
                          {dest.count}
                        </span>
                        <span className="text-xs sm:text-sm font-bold truncate text-[#1A2B5C]">
                          {dest.dest}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-[#78716C]">
                        {Math.round((dest.count / (shippingTotalCount || 1)) * 100)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Search bar & Detailed Table */}
          <div className="border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-[#E8DFC8]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#1A2B5C]" />
                <h2 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                  Detalle de Envíos Registrados ({filteredShippingOrders.length})
                </h2>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
                <input
                  type="text"
                  value={shippingSearch}
                  onChange={(e) => setShippingSearch(e.target.value)}
                  placeholder="Buscar cliente, lugar, #pedido..."
                  className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50"
                />
              </div>
            </div>

            {/* Shipments Table List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8DFC8] text-[#78716C] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-bold">N° Pedido</th>
                    <th className="py-2.5 px-3 font-bold">Vendedora (Registro)</th>
                    <th className="py-2.5 px-3 font-bold">Despachado / Enviado Por</th>
                    <th className="py-2.5 px-3 font-bold">Fecha Registro & Envío</th>
                    <th className="py-2.5 px-3 font-bold">Cliente & Contacto</th>
                    <th className="py-2.5 px-3 font-bold">Destino / Lugar</th>
                    <th className="py-2.5 px-3 font-bold">Artículos</th>
                    <th className="py-2.5 px-3 font-bold text-right">Monto (Bs.)</th>
                    <th className="py-2.5 px-3 font-bold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DFC8]">
                  {filteredShippingOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#78716C]">
                        No se encontraron envíos con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredShippingOrders.map((order) => {
                      const dateObj = new Date(order.createdAt);
                      const isDelivered = order.estado === 'Entregado';
                      const isAnulado = order.estado === 'Anulado';
                      const despachadorNombre = order.enviadoPorNombre || order.despachadoPorNombre || (isDelivered ? (order.vendedorNombre || 'Despachado') : null);

                      return (
                        <tr key={order.id} className="hover:bg-[#FBF7EF] transition">
                          <td className="py-3 px-3 font-black text-[#1A2B5C] whitespace-nowrap">
                            #{order.orderNumber}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-[#1A2B5C] block">
                              {order.vendedorNombre || 'Sin asignar'}
                            </span>
                            <span className="text-[10px] text-[#78716C]">Venta</span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {isDelivered ? (
                              <div>
                                <span className="font-bold text-emerald-800 flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  {despachadorNombre}
                                </span>
                                {order.fechaEnvio ? (
                                  <span className="text-[10px] text-[#78716C] block">
                                    {order.fechaEnvio}
                                  </span>
                                ) : order.despachadoAt ? (
                                  <span className="text-[10px] text-[#78716C] block">
                                    {new Date(order.despachadoAt).toLocaleDateString('es-BO', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </span>
                                ) : null}
                              </div>
                            ) : isAnulado ? (
                              <span className="text-[11px] text-rose-700 italic">Cancelado</span>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-medium">⏳ En preparación</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-[#78716C]">
                            <span className="block font-medium">
                              {dateObj.toLocaleDateString('es-BO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] block opacity-75">
                              {dateObj.toLocaleTimeString('es-BO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-bold text-[#1A2B5C] block">
                              {order.cliente}
                            </span>
                            {order.telefono && (
                              <span className="text-[11px] text-[#78716C]">
                                {formatBoliviaPhone(order.telefono)}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-start gap-1 max-w-[200px]">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-[#1A2B5C] line-clamp-2">
                                {order.lugarEntrega || 'Por coordinar'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 max-w-[180px]">
                            <div className="text-[11px] text-[#78716C] line-clamp-2">
                              {order.productos?.map((p, idx) => (
                                <span key={idx}>
                                  {formatArticleItem(p)}
                                  {idx < order.productos.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className="font-mono font-bold text-[#1A2B5C] block">
                              {formatCurrency(order.total)}
                            </span>
                            {order.saldo > 0 ? (
                              <span className="text-[10px] text-amber-700 font-bold">
                                Saldo: {formatCurrency(order.saldo)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold">
                                Pagado
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Entregado</span>
                              </span>
                            ) : isAnulado ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Anulado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>En Ruta / Pend.</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: REPORTE DE COMPRAS DE MATERIAL & MERCADERÍA */}
      {activeReportView === 'compras' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#78716C]">
                Inversión en Compras
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-['Outfit',sans-serif]">
                {formatCurrency(totalInvertido)}
              </span>
              <span className="text-[11px] block mt-0.5 text-[#78716C]/80">
                {validPurchases.length} compras de lote
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Pagado / Desembolsado
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif]">
                {formatCurrency(totalPagadoCompras)}
              </span>
              <span className="text-[11px] text-emerald-700/80 block mt-0.5">
                Efectivo & Transferencias
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-rose-200">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                Cuentas por Pagar (Saldos)
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-700 font-['Outfit',sans-serif]">
                {formatCurrency(totalDeudaProveedores)}
              </span>
              <span className="text-[11px] text-rose-700/80 block mt-0.5">
                Deuda pendiente proveedores
              </span>
            </div>

            <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#78716C]">
                Compra Promedio
              </span>
              <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                {formatCurrency(compraPromedio)}
              </span>
              <span className="text-[11px] block mt-0.5 text-[#78716C]/80">
                Promedio por factura/recibo
              </span>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Breakdown by Supplier */}
            <div className="lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Inversión por Proveedor Mayorista
                  </h2>
                </div>
                <span className="text-xs text-[#78716C]">Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {supplierPerformance.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin compras en este rango.
                  </p>
                ) : (
                  supplierPerformance.map((sup, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1A2B5C]">{sup.name}</h4>
                          <p className="text-[11px] text-[#78716C]">
                            {sup.count} compra(s)
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-amber-700 font-mono block">
                          {formatCurrency(sup.total)}
                        </span>
                        {sup.saldo > 0 ? (
                          <span className="text-[10px] text-rose-700 font-bold">
                            Debe: {formatCurrency(sup.saldo)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            100% Cancelado
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Materials / Goods Purchased */}
            <div className="lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                    Top Artículos & Materiales Comprados
                  </h2>
                </div>
                <span className="text-xs text-[#78716C]">Mayor volumen invertido</span>
              </div>

              <div className="space-y-3">
                {topMaterialsPurchased.length === 0 ? (
                  <p className="text-xs py-8 text-center text-[#78716C]">
                    Sin artículos registrados en este rango.
                  </p>
                ) : (
                  topMaterialsPurchased.map((mat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-[#FBF7EF] border-[#E8DFC8]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">
                          {mat.cantidad}u
                        </span>
                        <span className="text-xs sm:text-sm font-bold truncate text-[#1A2B5C]">
                          {mat.name}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-black font-mono shrink-0 text-[#1A2B5C]">
                        {formatCurrency(mat.totalBs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: BALANCE GENERAL (VENTAS VS COMPRAS) */}
      {activeReportView === 'balance' && !isComprador && (
        <div className="space-y-6 animate-in fade-in">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded-3xl p-5 shadow-sm bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A2B5C]">
                  1. Ingresos por Ventas
                </span>
                <ArrowUpRight className="w-5 h-5 text-[#1A2B5C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1A2B5C]">
                {formatCurrency(totalVendido)}
              </div>
              <p className="text-xs mt-1 text-[#78716C]">
                Efectivamente cobrado: <strong className="text-emerald-700">{formatCurrency(totalCobrado)}</strong>
              </p>
            </div>

            <div className="border rounded-3xl p-5 shadow-sm bg-white border-[#E8DFC8]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  2. Egresos en Compras
                </span>
                <ArrowDownRight className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
                {formatCurrency(totalInvertido)}
              </div>
              <p className="text-xs mt-1 text-[#78716C]">
                Desembolsado: <strong>{formatCurrency(totalPagadoCompras)}</strong>
              </p>
            </div>

            <div
              className={`rounded-3xl p-5 shadow-sm border ${
                flujoCajaNeto >= 0
                  ? 'bg-white border-emerald-300'
                  : 'bg-white border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    flujoCajaNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  3. Flujo Neto de Caja
                </span>
                <Scale className="w-5 h-5 text-emerald-700" />
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  flujoCajaNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatCurrency(flujoCajaNeto)}
              </div>
              <p className="text-xs mt-1 text-[#78716C]">
                (Ingreso cobrado - Desembolso de compras)
              </p>
            </div>
          </div>

          {/* Comparative Summary Table */}
          <div className="border rounded-3xl p-6 shadow-sm space-y-4 bg-white border-[#E8DFC8]">
            <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
              Resumen Financiero Consolidado
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between p-3 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="text-[#78716C]">Total Facturado en Ventas:</span>
                <span className="font-mono font-bold text-[#1A2B5C]">
                  {formatCurrency(totalVendido)}
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="text-[#78716C]">Total Inversión en Mercadería:</span>
                <span className="font-mono font-bold text-amber-700">{formatCurrency(totalInvertido)}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="text-[#78716C]">Cuentas por Cobrar (Saldos):</span>
                <span className="font-mono font-bold text-[#1A2B5C]">
                  {formatCurrency(totalPorCobrar)}
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="text-[#78716C]">Cuentas por Pagar a Proveedores:</span>
                <span className="font-mono font-bold text-rose-700">{formatCurrency(totalDeudaProveedores)}</span>
              </div>
              <div className="flex justify-between p-3.5 rounded-xl border text-base font-bold bg-emerald-50 border-emerald-200 text-emerald-800">
                <span>Margen Bruto de Ganancia Teórico:</span>
                <span className="font-mono">{formatCurrency(margenBrutoTeorico)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
