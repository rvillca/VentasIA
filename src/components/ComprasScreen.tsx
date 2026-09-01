import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Truck,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Edit3,
  RotateCcw,
  Printer,
  Trash2,
  CreditCard,
  Building2,
  Package,
  TrendingDown,
  FileSpreadsheet,
  Download,
  Phone,
  ChevronRight,
  X,
  Sparkles,
  Check,
  Tag,
} from 'lucide-react';
import { Purchase, PurchaseItem, PurchaseStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  formatCurrency,
  formatBoliviaPhone,
  savePurchaseToFirestore,
  updatePurchaseInFirestore,
  anularPurchaseInFirestore,
  deletePurchaseFromFirestore,
  getNextPurchaseNumber,
  completePurchaseBalanceInFirestore,
} from '../lib/storage';
import { PurchaseEditModal } from './compras/PurchaseEditModal';
import { PurchaseAnularModal } from './compras/PurchaseAnularModal';
import { PurchaseDeleteModal } from './compras/PurchaseDeleteModal';
import { PurchaseDetailModal } from './compras/PurchaseDetailModal';
import { PackagingQuickSelector } from './PackagingQuickSelector';

interface ComprasScreenProps {
  purchases?: Purchase[];
}

type PeriodFilter = 'today' | '7days' | 'this_month' | 'all';
type StatusFilter = 'all' | 'Pagado' | 'Saldo Pendiente' | 'Anulado';

const FREQUENT_SUPPLIERS = [
  'Importadora Mayorista Sakura Kawaii',
  'Fábrica de Mochilas El Alto',
  'Distribuidora Anime 3D & Figuras',
  'Distribuidora de Papelería Central',
  'Insumos & Embalajes La Paz',
  'Textiles & Confecciones Bolivia',
];

const CATEGORIES = [
  'Mochilas & Bolsos',
  'Papelería Kawaii',
  'Estuches & Cartucheras',
  'Insumos & Embalaje',
  'Accesorios & Llaveros',
  'Varios / Mercadería General',
];

export const ComprasScreen: React.FC<ComprasScreenProps> = ({ purchases = [] }) => {
  const { isJefe, isSupervisor, isComprador, userProfile, currentUser } = useAuth();
  const { isDark } = useTheme();

  // Navigation & Sub-views
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'reports'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month');

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [anularPurchase, setAnularPurchase] = useState<Purchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<Purchase | null>(null);
  const [printWidth, setPrintWidth] = useState<'58mm' | '80mm'>('58mm');
  const [showPayModal, setShowPayModal] = useState<Purchase | null>(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // New Purchase Form State
  const [proveedor, setProveedor] = useState('');
  const [telefonoProveedor, setTelefonoProveedor] = useState('');
  const [numeroFacturaRecibo, setNumeroFacturaRecibo] = useState('');
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Transferencia' | 'QR' | 'Crédito'>('Efectivo');
  const [fechaCompra, setFechaCompra] = useState(() => new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: 'item_' + Date.now(),
      nombre: '',
      categoria: 'Mochilas & Bolsos',
      variante: '',
      cantidad: 1,
      costoUnitario: 0,
      subtotal: 0,
    },
  ]);
  const [pagadoMonto, setPagadoMonto] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      // Date filter
      const pDate = new Date(p.fechaCompra || p.createdAt);
      let matchDate = true;
      if (periodFilter === 'today') {
        matchDate = pDate.toDateString() === now.toDateString();
      } else if (periodFilter === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = pDate >= past7;
      } else if (periodFilter === 'this_month') {
        matchDate =
          pDate.getMonth() === now.getMonth() &&
          pDate.getFullYear() === now.getFullYear();
      }

      // Status filter
      const matchStatus = statusFilter === 'all' || p.estado === statusFilter;

      // Search filter
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        p.proveedor.toLowerCase().includes(search) ||
        (p.numeroFacturaRecibo && p.numeroFacturaRecibo.toLowerCase().includes(search)) ||
        (p.compradorNombre && p.compradorNombre.toLowerCase().includes(search)) ||
        p.productos.some((item) => item.nombre.toLowerCase().includes(search));

      return matchDate && matchStatus && matchSearch;
    });
  }, [purchases, periodFilter, statusFilter, searchTerm]);

  // Overall Financial KPIs
  const validPurchases = useMemo(
    () => purchases.filter((p) => p.estado !== 'Anulado'),
    [purchases]
  );
  const filteredValid = useMemo(
    () => filteredPurchases.filter((p) => p.estado !== 'Anulado'),
    [filteredPurchases]
  );

  const totalInvertidoPeriodo = filteredValid.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagadoPeriodo = filteredValid.reduce((sum, p) => sum + (p.pagado || 0), 0);
  const totalSaldoPendiente = validPurchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
  const comprasConSaldo = validPurchases.filter((p) => p.saldo > 0);

  // Form Calculations
  const calculatedTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0), 0);
  }, [items]);

  const calculatedSaldo = Math.max(0, calculatedTotal - (Number(pagadoMonto) || 0));

  // Handle Form Item Changes
  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'cantidad' || field === 'costoUnitario') {
      const qty = field === 'cantidad' ? Number(value) : Number(item.cantidad);
      const cost = field === 'costoUnitario' ? Number(value) : Number(item.costoUnitario);
      item.subtotal = (qty || 0) * (cost || 0);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nombre: '',
        categoria: 'Papelería Kawaii',
        variante: '',
        cantidad: 1,
        costoUnitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const openNewPurchaseModal = () => {
    setProveedor('');
    setTelefonoProveedor('');
    setNumeroFacturaRecibo('');
    setMetodoPago('Efectivo');
    setFechaCompra(new Date().toISOString().split('T')[0]);
    setItems([
      {
        id: 'item_' + Date.now(),
        nombre: '',
        categoria: 'Mochilas & Bolsos',
        variante: '',
        cantidad: 1,
        costoUnitario: 0,
        subtotal: 0,
      },
    ]);
    setPagadoMonto(0);
    setObservaciones('');
    setFormError(null);
    setShowNewModal(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor.trim()) {
      setFormError('Por favor ingresa el nombre del proveedor o mayorista.');
      return;
    }

    const validItems = items.filter((it) => it.nombre.trim().length > 0 && it.cantidad > 0);
    if (validItems.length === 0) {
      setFormError('Agrega al menos un artículo o material con nombre y cantidad válida.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const total = calculatedTotal;
      const pagado = Math.min(total, Math.max(0, Number(pagadoMonto) || 0));
      const saldo = Math.max(0, total - pagado);
      const estado: PurchaseStatus = saldo === 0 ? 'Pagado' : 'Saldo Pendiente';

      const nextNum = getNextPurchaseNumber(purchases);

      const newPurchase: Purchase = {
        id: 'pur_' + Date.now(),
        purchaseNumber: nextNum,
        proveedor: proveedor.trim(),
        telefonoProveedor: telefonoProveedor.trim() || '',
        numeroFacturaRecibo: numeroFacturaRecibo.trim() || '',
        metodoPago,
        fechaCompra: new Date(fechaCompra).toISOString(),
        productos: validItems.map((it) => ({
          ...it,
          variante: it.variante?.trim() || '',
          categoria: it.categoria?.trim() || 'General',
          subtotal: it.cantidad * it.costoUnitario,
        })),
        total,
        pagado,
        saldo,
        estado,
        compradorUid: currentUser?.uid || 'user',
        compradorNombre: userProfile?.displayName || currentUser?.displayName || 'Supervisor/Comprador',
        observaciones: observaciones.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePurchaseToFirestore(newPurchase);
      setShowNewModal(false);
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      setFormError(err.message || 'Error al registrar la compra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;
    const monto = Number(abonoMonto);
    if (!monto || monto <= 0) return;

    try {
      const nuevoPagado = Math.min(showPayModal.total, (showPayModal.pagado || 0) + monto);
      const nuevoSaldo = Math.max(0, showPayModal.total - nuevoPagado);
      const nuevoEstado: PurchaseStatus = nuevoSaldo === 0 ? 'Pagado' : 'Saldo Pendiente';

      await updatePurchaseInFirestore(showPayModal.id, {
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        observaciones: `${showPayModal.observaciones || ''}\n[${new Date().toLocaleDateString('es-BO')}] Abono registrado: ${formatCurrency(monto)}`.trim(),
      });

      setShowPayModal(null);
      setAbonoMonto('');
      if (selectedPurchase && selectedPurchase.id === showPayModal.id) {
        setSelectedPurchase({
          ...selectedPurchase,
          pagado: nuevoPagado,
          saldo: nuevoSaldo,
          estado: nuevoEstado,
        });
      }
    } catch (err) {
      console.error('Error updating payment:', err);
    }
  };

  const handleAnularPurchase = async (purchase: Purchase) => {
    const motivo = window.prompt('Ingresa el motivo de anulación de esta compra:');
    if (motivo === null) return;
    try {
      await anularPurchaseInFirestore(
        purchase.id,
        userProfile?.displayName || 'Usuario',
        motivo || 'Anulación manual'
      );
      if (selectedPurchase?.id === purchase.id) {
        setSelectedPurchase(null);
      }
    } catch (err) {
      console.error('Error anulando purchase:', err);
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!isJefe) return;
    if (!window.confirm('¿Estás seguro de eliminar permanentemente este registro de compra?')) return;
    try {
      await deletePurchaseFromFirestore(purchaseId);
      if (selectedPurchase?.id === purchaseId) setSelectedPurchase(null);
    } catch (err) {
      console.error('Error deleting purchase:', err);
    }
  };

  // Export Purchases CSV
  const handleExportCSV = () => {
    let csv = 'Numero,Proveedor,Telefono,Comprobante,MetodoPago,Fecha,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Comprador,Observaciones\n';
    filteredPurchases.forEach((p) => {
      const dateStr = new Date(p.fechaCompra || p.createdAt).toLocaleDateString('es-BO');
      csv += `"#C-${String(p.purchaseNumber).padStart(3, '0')}","${p.proveedor.replace(/"/g, '""')}","${p.telefonoProveedor || ''}","${p.numeroFacturaRecibo || ''}","${p.metodoPago}","${dateStr}",${p.total},${p.pagado},${p.saldo},"${p.estado}","${p.compradorNombre || ''}","${(p.observaciones || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_compras_material_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="compras-screen-container" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-amber-500/60 text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              Módulo de Compras de Mercadería & Insumos
            </span>
            <span className="text-xs text-slate-400">
              {isJefe ? '👑 Acceso Total' : isSupervisor ? '📊 Supervisor' : '🛒 Comprador'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
            Control de Compras & Proveedores Mayoristas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Registro independiente de adquisición de mochilas, papelería, materiales de embalaje y cuentas por pagar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewPurchaseModal}
            className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Inversión ({periodFilter === 'all' ? 'Histórico' : 'Periodo'})
          </span>
          <span className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif]">
            {formatCurrency(totalInvertidoPeriodo)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {filteredValid.length} compra(s) registradas
          </span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-emerald-950/30">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Total Pagado a Proveedores
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300 font-['Outfit',sans-serif]">
            {formatCurrency(totalPagadoPeriodo)}
          </span>
          <span className="text-[11px] text-emerald-500/80 block mt-0.5">
            Desembolsado en efectivo/QR
          </span>
        </div>

        <div className={`bg-slate-900 rounded-2xl p-4 shadow-md border ${
          totalSaldoPendiente > 0
            ? 'border-rose-500/40 bg-gradient-to-br from-slate-900 to-rose-950/30'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
              Deuda Total a Proveedores
            </span>
            {totalSaldoPendiente > 0 && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                {comprasConSaldo.length} pendientes
              </span>
            )}
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-300 font-['Outfit',sans-serif]">
            {formatCurrency(totalSaldoPendiente)}
          </span>
          <span className="text-[11px] text-rose-400/80 block mt-0.5">
            Cuentas por pagar acumuladas
          </span>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-amber-950/30">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
            Total Compras Registradas
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-300 font-['Outfit',sans-serif]">
            {purchases.length}
          </span>
          <span className="text-[11px] text-amber-500/80 block mt-0.5">
            Lotes y compras de material
          </span>
        </div>
      </div>

      {/* Sub Tab Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lista de Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'reports'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Reportes de Compras</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-1.5 px-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'list' ? (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por proveedor, recibo o producto..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">Todos los estados</option>
                <option value="Pagado">✅ Pagados</option>
                <option value="Saldo Pendiente">⚠️ Con Saldo Pendiente</option>
                <option value="Anulado">🚫 Anulados</option>
              </select>
            </div>

            {/* Period Filter */}
            <div className="sm:col-span-3">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="today">Hoy</option>
                <option value="7days">Últimos 7 días</option>
                <option value="this_month">Este mes</option>
                <option value="all">Todo el historial</option>
              </select>
            </div>
          </div>

          {/* Purchases List */}
          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No se encontraron compras</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'No hay registros que coincidan con los filtros aplicados.'
                  : 'Aún no hay compras registradas en este periodo. Haz clic en el botón de abajo para registrar la primera compra de mercadería.'}
              </p>
              <button
                type="button"
                onClick={openNewPurchaseModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-amber-400 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nueva Compra</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPurchases.map((purchase) => {
                const isPaid = purchase.estado === 'Pagado';
                const isPending = purchase.estado === 'Saldo Pendiente';
                const isAnulado = purchase.estado === 'Anulado';

                const totalItemsCount = purchase.productos.reduce(
                  (acc, it) => acc + (it.cantidad || 1),
                  0
                );

                return (
                  <div
                    key={purchase.id}
                    className={`bg-slate-900 border rounded-3xl p-5 shadow-lg transition space-y-4 hover:border-slate-700 ${
                      isAnulado
                        ? 'border-rose-950/60 opacity-60'
                        : isPending
                        ? 'border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Card Top: Number, Date, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 font-mono font-bold text-xs">
                          #C-{String(purchase.purchaseNumber).padStart(3, '0')}
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                            {purchase.proveedor}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{new Date(purchase.fechaCompra || purchase.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            {purchase.numeroFacturaRecibo && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-300 font-mono">Doc: {purchase.numeroFacturaRecibo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                          isPaid
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : isPending
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isPaid && '✅ Pagado'}
                        {isPending && '⚠️ Saldo Pendiente'}
                        {isAnulado && '🚫 Anulado'}
                      </span>
                    </div>

                    {/* Products Preview (Top items) */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-b border-slate-800 pb-1">
                        <span>{totalItemsCount} artículo(s) en lote</span>
                        <span>{purchase.metodoPago}</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {purchase.productos.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                            <span className="truncate pr-2">
                              <strong className="text-amber-300">{item.cantidad}x</strong> {item.nombre}
                              {item.variante ? ` (${item.variante})` : ''}
                            </span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-slate-950/50 rounded-2xl border border-slate-800/60">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Compra</span>
                        <span className="text-xs sm:text-sm font-black text-white font-mono">
                          {formatCurrency(purchase.total)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase block">Pagado</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                          {formatCurrency(purchase.pagado)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-rose-400 uppercase block">Saldo Pendiente</span>
                        <span className={`text-xs sm:text-sm font-black font-mono ${purchase.saldo > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                          {formatCurrency(purchase.saldo)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400 truncate">
                        Por: <strong className="text-slate-300">{purchase.compradorNombre || 'Supervisor'}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {isPending && !isAnulado && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await completePurchaseBalanceInFirestore(purchase.id, purchase.total);
                                  setToastMessage(`¡Saldo de compra #C-${String(purchase.purchaseNumber).padStart(3, '0')} liquidado al 100%!`);
                                } catch (err) {
                                  console.error('Error completando saldo de compra:', err);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 transition active:scale-95 shadow-sm"
                              title="Completar saldo de compra inmediatamente en 1 clic"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Liquidar Saldo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowPayModal(purchase);
                                setAbonoMonto(String(purchase.saldo));
                              }}
                              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                              title="Registrar Abono parcial a Proveedor"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Abono</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingPurchase(purchase)}
                          className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                          title="Editar compra (corregir proveedor, artículos o montos)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPrintModal(purchase)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                          title="Imprimir Comprobante Térmico"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(purchase)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Detalle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Button (FAB) for New Purchase on mobile and desktop */}
          <div className="fixed bottom-6 right-6 z-40">
            <button
              id="fab-new-purchase-btn"
              type="button"
              onClick={openNewPurchaseModal}
              className={`py-3.5 px-5 rounded-full font-black text-sm active:scale-95 shadow-2xl flex items-center gap-2 transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/40 border border-[#FF6FA5]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/40'
              }`}
              title="Registrar nueva compra"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Compra</span>
              <span className="sm:hidden">Compra</span>
            </button>
          </div>
        </div>
      ) : (
        /* Sub Tab: Compras Analytics / Reports */
        <ComprasReportsTab purchases={purchases} />
      )}

      {/* Modal: Registrar Nueva Compra */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
                    Registrar Compra de Mercadería / Insumos
                  </h2>
                  <p className="text-xs text-slate-400">
                    Compra #{String(getNextPurchaseNumber(purchases)).padStart(3, '0')} • Importadora Chiquiminisos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-4">
              {/* Row 1: Proveedor & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Proveedor o Mayorista *
                  </label>
                  <input
                    type="text"
                    required
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    placeholder="ej: Importadora Sakura Kawaii"
                    list="frequent-suppliers-list"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <datalist id="frequent-suppliers-list">
                    {FREQUENT_SUPPLIERS.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Teléfono Proveedor
                  </label>
                  <input
                    type="text"
                    value={telefonoProveedor}
                    onChange={(e) => setTelefonoProveedor(e.target.value)}
                    placeholder="ej: 76543210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Row 2: Fecha, N° Recibo/Factura, Método de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fecha de Compra
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    N° Factura / Recibo / Remisión
                  </label>
                  <input
                    type="text"
                    value={numeroFacturaRecibo}
                    onChange={(e) => setNumeroFacturaRecibo(e.target.value)}
                    placeholder="ej: REC-1024"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="QR">📱 QR / Transferencia Rápida</option>
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                    <option value="Crédito">📋 A Crédito</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Items Table */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Materiales / Artículos Comprados ({items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Artículo</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-7">
                          <input
                            type="text"
                            required
                            placeholder="Nombre del producto / material *"
                            value={item.nombre}
                            onChange={(e) => handleItemChange(index, 'nombre', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Presentación (ej. Box de 24 u., ½ Box...)"
                            value={item.variante || ''}
                            onChange={(e) => handleItemChange(index, 'variante', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                      </div>

                      {/* Quick presentation selector */}
                      <div className="pt-0.5">
                        <PackagingQuickSelector
                          value={item.variante || ''}
                          onChange={(preset) => handleItemChange(index, 'variante', preset)}
                          theme="amber"
                        />
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <select
                            value={item.categoria || 'Papelería Kawaii'}
                            onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-2 text-[11px] font-bold text-slate-300 focus:outline-none"
                          >
                            {CATEGORIES.map((cat, idx) => (
                              <option key={idx} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Cant:</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.cantidad === 0 ? '' : item.cantidad}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(index, 'cantidad', val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                              }}
                              placeholder="0"
                              className="w-full bg-transparent text-xs text-white font-mono focus:outline-none text-right"
                            />
                          </div>
                        </div>

                        <div className="col-span-3">
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Bs c/u:</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.costoUnitario === 0 ? '' : item.costoUnitario}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(index, 'costoUnitario', val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                              }}
                              placeholder="0.00"
                              className="w-full bg-transparent text-xs text-white font-mono focus:outline-none text-right"
                            />
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {formatCurrency(item.subtotal || 0)}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Settlement Breakdown */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Total Inversión (Bs.)
                    </label>
                    <div className="text-xl font-black text-white font-mono">
                      {formatCurrency(calculatedTotal)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      Monto Pagado / Anticipo (Bs.)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max={calculatedTotal}
                        value={pagadoMonto === 0 ? '' : pagadoMonto}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPagadoMonto(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                        }}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl py-2 px-3 text-sm font-bold text-emerald-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setPagadoMonto(calculatedTotal)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-900"
                      >
                        Total
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                      Saldo a Pagar al Proveedor
                    </label>
                    <div className={`text-xl font-black font-mono ${calculatedSaldo > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                      {formatCurrency(calculatedSaldo)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Observaciones / Notas de Entrega
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="ej: Mercadería entregada en caja sellada, calidad revisada."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs sm:text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Compra de Mercadería</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Compra */}
      {selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          isJefe={isJefe}
          onClose={() => setSelectedPurchase(null)}
          onEdit={(p) => {
            setEditingPurchase(p);
          }}
          onAnular={(p) => {
            setAnularPurchase(p);
          }}
          onPrint={(p) => {
            setShowPrintModal(p);
          }}
          onPayBalance={(p) => {
            setShowPayModal(p);
            setAbonoMonto(String(p.saldo));
          }}
          onDelete={(p) => {
            setDeletingPurchase(p);
          }}
          onReactivada={(updated) => {
            setSelectedPurchase(updated);
            setToastMessage(
              `🔄 Compra #C-${String(updated.purchaseNumber).padStart(3, '0')} reactivada exitosamente.`
            );
          }}
        />
      )}

      {/* Modal: Editar Compra */}
      {editingPurchase && (
        <PurchaseEditModal
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSaved={(updated) => {
            if (selectedPurchase && selectedPurchase.id === updated.id) {
              setSelectedPurchase(updated);
            }
            setToastMessage(
              `✅ Compra #C-${String(updated.purchaseNumber).padStart(3, '0')} actualizada correctamente.`
            );
          }}
        />
      )}

      {/* Modal: Anular Compra */}
      {anularPurchase && (
        <PurchaseAnularModal
          purchase={anularPurchase}
          userName={userProfile?.displayName || currentUser?.displayName || 'Comprador'}
          onClose={() => setAnularPurchase(null)}
          onAnulado={(id, motivo) => {
            if (selectedPurchase && selectedPurchase.id === id) {
              setSelectedPurchase({
                ...selectedPurchase,
                estado: 'Anulado',
                anuladoPor: userProfile?.displayName || currentUser?.displayName || 'Comprador',
                motivoAnulacion: motivo,
                anuladoAt: new Date().toISOString(),
              });
            }
            setToastMessage(`🚫 Compra anulada correctamente.`);
          }}
        />
      )}

      {/* Modal: Eliminar Compra (Jefe) */}
      {deletingPurchase && (
        <PurchaseDeleteModal
          purchase={deletingPurchase}
          onClose={() => setDeletingPurchase(null)}
          onDeleted={(id) => {
            if (selectedPurchase && selectedPurchase.id === id) {
              setSelectedPurchase(null);
            }
            setToastMessage(`🗑️ Registro de compra eliminado.`);
          }}
        />
      )}

      {/* Modal: Registrar Abono de Saldo Pendiente */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pagar Saldo a Proveedor</h3>
                  <p className="text-xs text-slate-400">{showPayModal.proveedor}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Total Compra:</span>
                <span className="font-mono text-white">{formatCurrency(showPayModal.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Pagado actualmente:</span>
                <span className="font-mono">{formatCurrency(showPayModal.pagado)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                <span>Saldo por liquidar:</span>
                <span className="font-mono">{formatCurrency(showPayModal.saldo)}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Monto a Abonar (Bs.)
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  max={showPayModal.saldo}
                  step="0.5"
                  value={abonoMonto}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAbonoMonto(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl py-2.5 px-3 text-sm font-black text-emerald-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Impresión Térmica de Compra */}
      {showPrintModal && (
        <PurchaseThermalPrintModal
          purchase={showPrintModal}
          onClose={() => setShowPrintModal(null)}
        />
      )}

      {/* Floating Action Button (FAB) for Nueva Compra - Always visible while scrolling */}
      {activeSubTab === 'list' && (
        <div className="fixed bottom-6 right-6 z-30 sm:bottom-8 sm:right-8 pointer-events-none">
          <button
            id="fab-new-purchase-btn"
            type="button"
            onClick={() => setShowNewModal(true)}
            className="pointer-events-auto group flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-full shadow-2xl shadow-amber-900/60 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-amber-300/40 cursor-pointer"
            title="Registrar Nueva Compra (Botón Rápido Flotante)"
          >
            <div className="w-6 h-6 rounded-full bg-slate-950/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-200">
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            </div>
            <span className="font-['Outfit',sans-serif] tracking-tight font-black">
              + Nueva Compra
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Sub-component for Compras Analytics / Reports (Daily, Weekly, Monthly, Top Suppliers, Top Materials)
 */
const ComprasReportsTab: React.FC<{ purchases: Purchase[] }> = ({ purchases }) => {
  const [period, setPeriod] = useState<PeriodFilter>('this_month');

  const validPurchases = useMemo(() => purchases.filter((p) => p.estado !== 'Anulado'), [purchases]);

  const filtered = useMemo(() => {
    const now = new Date();
    return validPurchases.filter((p) => {
      const pDate = new Date(p.fechaCompra || p.createdAt);
      if (period === 'today') {
        return pDate.toDateString() === now.toDateString();
      } else if (period === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return pDate >= past7;
      } else if (period === 'this_month') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [validPurchases, period]);

  const totalInvertido = filtered.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagado = filtered.reduce((sum, p) => sum + (p.pagado || 0), 0);
  const totalSaldo = filtered.reduce((sum, p) => sum + (p.saldo || 0), 0);

  // Top Suppliers
  const topSuppliers = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtered.forEach((p) => {
      const sup = p.proveedor || 'Sin proveedor';
      if (!map[sup]) map[sup] = { total: 0, count: 0 };
      map[sup].total += p.total || 0;
      map[sup].count += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Top Purchased Materials
  const topMaterials = useMemo(() => {
    const map: Record<string, { cantidad: number; totalBs: number }> = {};
    filtered.forEach((p) => {
      p.productos.forEach((prod) => {
        const name = prod.nombre.trim();
        if (!map[name]) map[name] = { cantidad: 0, totalBs: 0 };
        map[name].cantidad += prod.cantidad || 1;
        map[name].totalBs += (prod.cantidad || 1) * (prod.costoUnitario || 0);
      });
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, cantidad: d.cantidad, totalBs: d.totalBs }))
      .sort((a, b) => b.totalBs - a.totalBs)
      .slice(0, 8);
  }, [filtered]);

  // Purchases by day
  const purchasesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((p) => {
      const dateKey = new Date(p.fechaCompra || p.createdAt).toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
      });
      map[dateKey] = (map[dateKey] || 0) + (p.total || 0);
    });
    return Object.entries(map).map(([day, total]) => ({ day, total }));
  }, [filtered]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Period Buttons */}
      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setPeriod('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            period === 'today' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Hoy (Diario)
        </button>
        <button
          onClick={() => setPeriod('7days')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            period === '7days' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Últimos 7 Días (Semanal)
        </button>
        <button
          onClick={() => setPeriod('this_month')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            period === 'this_month' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Este Mes (Mensual)
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            period === 'all' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Histórico Total
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Suppliers */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                Inversión por Proveedor
              </h3>
            </div>
            <span className="text-xs text-slate-400">Mayor volumen</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {topSuppliers.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Sin compras en este periodo.</p>
            ) : (
              topSuppliers.map((sup, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-950 text-amber-300 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{sup.name}</h4>
                      <span className="text-[11px] text-slate-400">{sup.count} compra(s)</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-300">{formatCurrency(sup.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Materials / Products */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                Materiales / Artículos Adquiridos
              </h3>
            </div>
            <span className="text-xs text-slate-400">Mayor inversión</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {topMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Sin artículos en este periodo.</p>
            ) : (
              topMaterials.map((mat, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-amber-950 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {mat.cantidad}u
                    </span>
                    <span className="text-xs font-bold text-white truncate">{mat.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-white shrink-0">
                    {formatCurrency(mat.totalBs)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Thermal Print Modal for Purchases
 */
const PurchaseThermalPrintModal: React.FC<{
  purchase: Purchase;
  onClose: () => void;
}> = ({ purchase, onClose }) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');

  const handlePrint = () => {
    window.print();
  };

  const dateStr = new Date(purchase.fechaCompra || purchase.createdAt).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Comprobante Térmico de Compra</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Width selection */}
        <div className="flex items-center justify-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setPaperWidth('58mm')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              paperWidth === '58mm' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Formato 58mm (Estrecho)
          </button>
          <button
            onClick={() => setPaperWidth('80mm')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              paperWidth === '80mm' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Formato 80mm (Estándar)
          </button>
        </div>

        {/* Paper Preview */}
        <div className="bg-slate-950 p-4 rounded-2xl flex justify-center">
          <div
            id="printable-purchase-receipt"
            className="bg-white text-black p-4 font-mono text-xs rounded-lg shadow-xl"
            style={{ width: paperWidth === '58mm' ? '240px' : '300px' }}
          >
            <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
              <h2 className="font-bold text-sm">CHIQUIMINISOS</h2>
              <p className="text-[10px]">COMPROBANTE DE COMPRA / INGRESO</p>
              <p className="text-[10px]">#C-{String(purchase.purchaseNumber).padStart(3, '0')}</p>
              <p className="text-[10px]">Fecha: {dateStr}</p>
            </div>

            <div className="text-[10px] space-y-0.5 mb-2 border-b border-dashed border-black pb-2">
              <p><strong>PROVEEDOR:</strong> {purchase.proveedor}</p>
              {purchase.telefonoProveedor && <p><strong>TEL:</strong> {purchase.telefonoProveedor}</p>}
              {purchase.numeroFacturaRecibo && <p><strong>DOC:</strong> {purchase.numeroFacturaRecibo}</p>}
              <p><strong>RESPONSABLE:</strong> {purchase.compradorNombre || 'Supervisor'}</p>
              <p><strong>PAGO:</strong> {purchase.metodoPago}</p>
            </div>

            <div className="text-[10px] space-y-1 mb-2 border-b border-dashed border-black pb-2">
              <div className="flex justify-between font-bold">
                <span>ARTÍCULO</span>
                <span>SUBT.</span>
              </div>
              {purchase.productos.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.cantidad}x {it.nombre}</span>
                  <span>Bs. {it.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] space-y-0.5 mb-2 border-b border-dashed border-black pb-2">
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>Bs. {purchase.total}</span>
              </div>
              <div className="flex justify-between">
                <span>PAGADO:</span>
                <span>Bs. {purchase.pagado}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>SALDO:</span>
                <span>Bs. {purchase.saldo}</span>
              </div>
            </div>

            <div className="text-center text-[9px] pt-1">
              *** REGISTRO DE ALMACÉN ***
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Mandar a Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
