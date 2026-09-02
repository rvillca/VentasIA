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
  Box,
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
  formatArticleItem,
} from '../lib/storage';
import { PurchaseEditModal } from './compras/PurchaseEditModal';
import { PurchaseAnularModal } from './compras/PurchaseAnularModal';
import { PurchaseDeleteModal } from './compras/PurchaseDeleteModal';
import { PurchaseDetailModal } from './compras/PurchaseDetailModal';
import { PackagingSelectionModal } from './PackagingSelectionModal';

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
  const [packagingModalIndex, setPackagingModalIndex] = useState<number | null>(null);

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
        <div className="fixed top-5 right-5 z-50 bg-[#1A2B5C] border border-[#223368] text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              Módulo de Compras de Mercadería & Insumos
            </span>
            <span className="text-xs text-[#78716C]">
              {isJefe ? '👑 Acceso Total' : isSupervisor ? '📊 Supervisor' : '🛒 Comprador'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1A2B5C] font-['Outfit',sans-serif] tracking-tight">
            Control de Compras & Proveedores Mayoristas
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Registro independiente de adquisición de mochilas, papelería, materiales de embalaje y cuentas por pagar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewPurchaseModal}
            className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider block mb-1">
            Inversión ({periodFilter === 'all' ? 'Histórico' : 'Periodo'})
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#1A2B5C] font-['Outfit',sans-serif]">
            {formatCurrency(totalInvertidoPeriodo)}
          </span>
          <span className="text-[11px] text-[#78716C] block mt-0.5">
            {filteredValid.length} compra(s) registradas
          </span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/50">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Total Pagado a Proveedores
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif]">
            {formatCurrency(totalPagadoPeriodo)}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">
            Desembolsado en efectivo/QR
          </span>
        </div>

        <div className={`bg-white rounded-2xl p-4 shadow-sm border ${
          totalSaldoPendiente > 0
            ? 'border-rose-200 bg-gradient-to-br from-white to-rose-50/50'
            : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
              Deuda Total a Proveedores
            </span>
            {totalSaldoPendiente > 0 && (
              <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                {comprasConSaldo.length} pendientes
              </span>
            )}
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-700 font-['Outfit',sans-serif]">
            {formatCurrency(totalSaldoPendiente)}
          </span>
          <span className="text-[11px] text-rose-600 block mt-0.5">
            Cuentas por pagar acumuladas
          </span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-amber-50/50">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Total Compras Registradas
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-800 font-['Outfit',sans-serif]">
            {purchases.length}
          </span>
          <span className="text-[11px] text-amber-700 block mt-0.5">
            Lotes y compras de material
          </span>
        </div>
      </div>

      {/* Sub Tab Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8DFC8] rounded-2xl p-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-extrabold'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lista de Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-extrabold'
                : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
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
            className="py-1.5 px-3 rounded-xl font-bold text-xs text-[#1A2B5C] bg-[#FBF7EF] hover:bg-[#F5EFE0] border border-[#E8DFC8] flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
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
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por proveedor, recibo o producto..."
                className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1A2B5C] cursor-pointer"
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
                className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1A2B5C] focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
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
                className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1A2B5C] focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
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
            <div className="p-12 text-center bg-white border border-[#E8DFC8] rounded-3xl space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1A2B5C]">No se encontraron compras</h3>
              <p className="text-xs text-[#78716C] max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'No hay registros que coincidan con los filtros aplicados.'
                  : 'Aún no hay compras registradas en este periodo. Haz clic en el botón de abajo para registrar la primera compra de mercadería.'}
              </p>
              <button
                type="button"
                onClick={openNewPurchaseModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md hover:bg-amber-600 transition cursor-pointer"
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
                    className={`bg-white border rounded-3xl p-5 shadow-sm transition space-y-4 hover:border-[#1A2B5C]/40 ${
                      isAnulado
                        ? 'border-rose-200 opacity-60'
                        : isPending
                        ? 'border-amber-300 bg-gradient-to-br from-white via-white to-amber-50/30'
                        : 'border-[#E8DFC8]'
                    }`}
                  >
                    {/* Card Top: Number, Date, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-mono font-bold text-xs">
                          #C-{String(purchase.purchaseNumber).padStart(3, '0')}
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-[#1A2B5C] leading-tight">
                            {purchase.proveedor}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-[#78716C] mt-0.5">
                            <span>{new Date(purchase.fechaCompra || purchase.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            {purchase.numeroFacturaRecibo && (
                              <>
                                <span>•</span>
                                <span className="text-[#1A2B5C] font-mono">Doc: {purchase.numeroFacturaRecibo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isPaid && '✅ Pagado'}
                        {isPending && '⚠️ Saldo Pendiente'}
                        {isAnulado && '🚫 Anulado'}
                      </span>
                    </div>

                    {/* Products Preview (Top items) */}
                    <div className="bg-[#FBF7EF] border border-[#E8DFC8] rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[#78716C] font-bold border-b border-[#E8DFC8] pb-1">
                        <span>{totalItemsCount} artículo(s) en lote</span>
                        <span>{purchase.metodoPago}</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {purchase.productos.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-[#1A2B5C]">
                            <span className="truncate pr-2">
                              {formatArticleItem(item)}
                            </span>
                            <span className="font-mono text-[#78716C] shrink-0">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-[#FBF7EF] rounded-2xl border border-[#E8DFC8]">
                      <div>
                        <span className="text-[10px] font-bold text-[#78716C] uppercase block">Total Compra</span>
                        <span className="text-xs sm:text-sm font-black text-[#1A2B5C] font-mono">
                          {formatCurrency(purchase.total)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Pagado</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                          {formatCurrency(purchase.pagado)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">Saldo Pendiente</span>
                        <span className={`text-xs sm:text-sm font-black font-mono ${purchase.saldo > 0 ? 'text-rose-700' : 'text-[#78716C]'}`}>
                          {formatCurrency(purchase.saldo)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-[#E8DFC8]">
                      <div className="text-[11px] text-[#78716C] truncate">
                        Por: <strong className="text-[#1A2B5C]">{purchase.compradorNombre || 'Supervisor'}</strong>
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
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer"
                              title="Completar saldo de compra inmediatamente en 1 clic"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Liquidar Saldo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowPayModal(purchase);
                                setAbonoMonto(String(purchase.saldo));
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
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
                          className="p-1.5 text-[#78716C] hover:text-[#1A2B5C] bg-[#FBF7EF] hover:bg-[#F5EFE0] border border-[#E8DFC8] rounded-xl transition cursor-pointer"
                          title="Editar compra (corregir proveedor, artículos o montos)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPrintModal(purchase)}
                          className="p-1.5 text-[#78716C] hover:text-[#1A2B5C] bg-[#FBF7EF] hover:bg-[#F5EFE0] border border-[#E8DFC8] rounded-xl transition cursor-pointer"
                          title="Imprimir Comprobante Térmico"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(purchase)}
                          className="px-3 py-1.5 bg-[#1A2B5C] hover:bg-[#253B7A] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Detalle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Button (FAB) for New Purchase */}
          <div className="fixed bottom-6 right-6 z-40">
            <button
              id="fab-new-purchase-btn"
              type="button"
              onClick={openNewPurchaseModal}
              className="py-3.5 px-5 rounded-full font-black text-sm active:scale-95 shadow-xl flex items-center gap-2 transition-all cursor-pointer bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/30"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-[#E8DFC8] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#1A2B5C] font-['Outfit',sans-serif]">
                    Registrar Compra de Mercadería / Insumos
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Compra #{String(getNextPurchaseNumber(purchases)).padStart(3, '0')} • Importadora Chiquiminisos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-[#78716C] hover:text-[#1A2B5C] rounded-lg hover:bg-[#FBF7EF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-4">
              {/* Row 1: Proveedor & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    Proveedor o Mayorista *
                  </label>
                  <input
                    type="text"
                    required
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    placeholder="ej: Importadora Sakura Kawaii"
                    list="frequent-suppliers-list"
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs sm:text-sm text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                  />
                  <datalist id="frequent-suppliers-list">
                    {FREQUENT_SUPPLIERS.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>

                  {/* Frequent supplier pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {FREQUENT_SUPPLIERS.map((sup, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProveedor(sup)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          proveedor === sup
                            ? 'bg-[#1A2B5C] text-white font-bold border-[#1A2B5C]'
                            : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
                        }`}
                      >
                        {sup}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    Teléfono Proveedor
                  </label>
                  <input
                    type="text"
                    value={telefonoProveedor}
                    onChange={(e) => setTelefonoProveedor(e.target.value)}
                    placeholder="ej: 76543210"
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs sm:text-sm text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                  />
                </div>

                {/* Row 2: Fecha, N° Recibo/Factura, Método de Pago */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    Fecha de Compra
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs sm:text-sm text-[#1A2B5C] focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    N° Factura / Recibo
                  </label>
                  <input
                    type="text"
                    value={numeroFacturaRecibo}
                    onChange={(e) => setNumeroFacturaRecibo(e.target.value)}
                    placeholder="ej: REC-1024"
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs sm:text-sm font-mono text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-[#1A2B5C] focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="QR">📱 QR / Transferencia Rápida</option>
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                    <option value="Crédito">📋 A Crédito</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Items Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span>Materiales / Artículos Comprados ({items.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer bg-amber-500 text-white hover:bg-amber-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Añadir Producto</span>
                  </button>
                </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-[#FBF7EF] border border-[#E8DFC8] rounded-2xl space-y-3"
                      >
                        {/* Name & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-7">
                            <label className="block text-[10px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                              Nombre del Producto / Material *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="ej: Gomas Kawaii Sanrio, Mochilas 3D, Cintas..."
                              value={item.nombre}
                              onChange={(e) => handleItemChange(index, 'nombre', e.target.value)}
                              className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs font-bold text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                              Categoría
                            </label>
                            <select
                              value={item.categoria || 'Papelería Kawaii'}
                              onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                              className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-2.5 text-xs font-bold text-[#1A2B5C] focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                            >
                              {CATEGORIES.map((cat, idx) => (
                                <option key={idx} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Presentation / Packaging / Box Selector with Popup Window like Ventas */}
                        <div>
                          <label className="block text-[11px] font-bold mb-1 flex items-center justify-between text-[#78716C]">
                            <span>Presentación / Empaque / Variante</span>
                            <span className="text-[10px] font-bold text-[#1A2B5C]">
                              Toca para abrir ventana:
                            </span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.variante || ''}
                              onClick={() => setPackagingModalIndex(index)}
                              onChange={(e) => handleItemChange(index, 'variante', e.target.value)}
                              placeholder="Ej. Box de 48 u., Docena (12 u.), Medio Box..."
                              className="flex-1 bg-white border border-[#E8DFC8] rounded-xl px-3 py-2 text-xs font-medium text-[#1A2B5C] placeholder-[#78716C]/60 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]"
                            />
                            <button
                              type="button"
                              onClick={() => setPackagingModalIndex(index)}
                              className="px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-sm"
                              title="Abrir ventana emergente de selección de cajas y docenas"
                            >
                              <Box className="w-3.5 h-3.5 text-amber-300" />
                              <span>Elegir Box</span>
                            </button>
                          </div>

                          {/* Selected variant badge */}
                          {item.variante && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-[#78716C]">
                                Seleccionado:
                              </span>
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 border bg-white text-[#1A2B5C] border-[#E8DFC8]">
                                ✨ {item.variante}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-2 pt-1 border-t border-[#E8DFC8] items-center">
                          {/* Quantity Counter aligned with Ventas */}
                          <div className="col-span-5 sm:col-span-5">
                            <label className="block text-[10px] uppercase font-bold mb-1 text-[#78716C]">
                              Cantidad
                            </label>
                            <div className="flex items-center border rounded-xl overflow-hidden bg-white border-[#E8DFC8]">
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemChange(
                                    index,
                                    'cantidad',
                                    Math.max(0, (Number(item.cantidad) || 0) - 1)
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[#1A2B5C] hover:bg-[#F5EFE0] transition cursor-pointer shrink-0"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={item.cantidad === 0 ? '' : item.cantidad}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleItemChange(
                                    index,
                                    'cantidad',
                                    val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0)
                                  );
                                }}
                                placeholder="0"
                                className="w-full bg-transparent text-center text-xs font-black focus:outline-none text-[#1A2B5C]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleItemChange(
                                    index,
                                    'cantidad',
                                    (Number(item.cantidad) || 0) + 1
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[#1A2B5C] hover:bg-[#F5EFE0] transition cursor-pointer shrink-0"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="col-span-4 sm:col-span-4">
                            <label className="block text-[10px] uppercase font-bold mb-1 text-[#78716C]">
                              Costo Unitario
                            </label>
                            <div className="flex items-center gap-1 bg-white border border-[#E8DFC8] rounded-xl px-2.5 py-1.5">
                              <span className="text-[10px] text-[#78716C] uppercase font-bold">Bs:</span>
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
                                className="w-full bg-transparent text-xs text-[#1A2B5C] font-mono font-bold focus:outline-none text-right"
                              />
                            </div>
                          </div>

                          <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-1.5 pt-4">
                            <span className="text-xs font-mono font-bold text-[#1A2B5C]">
                              {formatCurrency((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0))}
                            </span>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer transition"
                                title="Eliminar artículo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>

              {/* Payment Settlement Breakdown */}
              <div className="bg-[#FBF7EF] border border-[#E8DFC8] rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                      Total Inversión (Bs.)
                    </label>
                    <div className="text-xl font-black text-[#1A2B5C] font-mono">
                      {formatCurrency(calculatedTotal)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
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
                        className="w-full bg-white border border-emerald-300 rounded-xl py-2 px-3 text-sm font-bold text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPagadoMonto(calculatedTotal)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        Total
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                      Saldo a Pagar al Proveedor
                    </label>
                    <div className={`text-xl font-black font-mono ${calculatedSaldo > 0 ? 'text-rose-700' : 'text-[#78716C]'}`}>
                      {formatCurrency(calculatedSaldo)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                    Observaciones / Notas de Entrega
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="ej: Mercadería entregada en caja sellada, calidad revisada."
                    className="w-full bg-white border border-[#E8DFC8] rounded-xl py-2 px-3 text-xs text-[#1A2B5C] placeholder-[#78716C]/50 focus:outline-none focus:ring-1 focus:ring-[#1A2B5C]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF] font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-[#E8DFC8] rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A2B5C]">Pagar Saldo a Proveedor</h3>
                  <p className="text-xs text-[#78716C]">{showPayModal.proveedor}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(null)}
                className="p-1.5 text-[#78716C] hover:text-[#1A2B5C] rounded-lg hover:bg-[#FBF7EF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FBF7EF] rounded-xl border border-[#E8DFC8] text-xs space-y-1">
              <div className="flex justify-between text-[#78716C]">
                <span>Total Compra:</span>
                <span className="font-mono text-[#1A2B5C]">{formatCurrency(showPayModal.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Pagado actualmente:</span>
                <span className="font-mono">{formatCurrency(showPayModal.pagado)}</span>
              </div>
              <div className="flex justify-between text-rose-800 font-bold border-t border-[#E8DFC8] pt-1">
                <span>Saldo por liquidar:</span>
                <span className="font-mono">{formatCurrency(showPayModal.saldo)}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                  Monto a Abonar (Bs.)
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  max={showPayModal.saldo}
                  step="any"
                  value={abonoMonto}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAbonoMonto(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl py-2.5 px-3 text-sm font-black text-emerald-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF] font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
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

      {/* Modal: Selección de Presentación / Box Emergente (igual a Ventas) */}
      <PackagingSelectionModal
        isOpen={packagingModalIndex !== null}
        onClose={() => setPackagingModalIndex(null)}
        productName={
          packagingModalIndex !== null && items[packagingModalIndex]
            ? items[packagingModalIndex].nombre || `Artículo #${packagingModalIndex + 1}`
            : 'Material / Producto'
        }
        currentValue={
          packagingModalIndex !== null && items[packagingModalIndex]
            ? items[packagingModalIndex].variante || ''
            : ''
        }
        onSelect={(presetLabel) => {
          if (packagingModalIndex !== null) {
            handleItemChange(packagingModalIndex, 'variante', presetLabel);
          }
        }}
      />
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

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Period Buttons */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#E8DFC8] shadow-sm overflow-x-auto">
        <button
          onClick={() => setPeriod('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            period === 'today' ? 'bg-[#1A2B5C] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
          }`}
        >
          Hoy (Diario)
        </button>
        <button
          onClick={() => setPeriod('7days')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            period === '7days' ? 'bg-[#1A2B5C] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
          }`}
        >
          Últimos 7 Días (Semanal)
        </button>
        <button
          onClick={() => setPeriod('this_month')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            period === 'this_month' ? 'bg-[#1A2B5C] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
          }`}
        >
          Este Mes (Mensual)
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            period === 'all' ? 'bg-[#1A2B5C] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
          }`}
        >
          Histórico Total
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Suppliers */}
        <div className="lg:col-span-6 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-[#1A2B5C] font-['Outfit',sans-serif]">
                Inversión por Proveedor
              </h3>
            </div>
            <span className="text-xs text-[#78716C]">Mayor volumen</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {topSuppliers.length === 0 ? (
              <p className="text-xs text-[#78716C] py-8 text-center">Sin compras en este periodo.</p>
            ) : (
              topSuppliers.map((sup, idx) => (
                <div key={idx} className="p-3 bg-[#FBF7EF] rounded-2xl border border-[#E8DFC8] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A2B5C]">{sup.name}</h4>
                      <span className="text-[11px] text-[#78716C]">{sup.count} compra(s)</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-amber-800">{formatCurrency(sup.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Materials / Products */}
        <div className="lg:col-span-6 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-[#1A2B5C] font-['Outfit',sans-serif]">
                Materiales / Artículos Adquiridos
              </h3>
            </div>
            <span className="text-xs text-[#78716C]">Mayor inversión</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {topMaterials.length === 0 ? (
              <p className="text-xs text-[#78716C] py-8 text-center">Sin artículos en este periodo.</p>
            ) : (
              topMaterials.map((mat, idx) => (
                <div key={idx} className="p-3 bg-[#FBF7EF] rounded-2xl border border-[#E8DFC8] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 border border-amber-200">
                      {mat.cantidad}u
                    </span>
                    <span className="text-xs font-bold text-[#1A2B5C] truncate">{mat.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-[#1A2B5C] shrink-0">
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-[#E8DFC8] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-[#E8DFC8] pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-[#1A2B5C]">Comprobante Térmico de Compra</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#78716C] hover:text-[#1A2B5C] rounded-lg hover:bg-[#FBF7EF] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Width selection */}
        <div className="flex items-center justify-center gap-2 bg-[#FBF7EF] p-1.5 rounded-xl border border-[#E8DFC8]">
          <button
            onClick={() => setPaperWidth('58mm')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              paperWidth === '58mm' ? 'bg-[#1A2B5C] text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Formato 58mm (Estrecho)
          </button>
          <button
            onClick={() => setPaperWidth('80mm')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              paperWidth === '80mm' ? 'bg-[#1A2B5C] text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Formato 80mm (Estándar)
          </button>
        </div>

        {/* Paper Preview */}
        <div className="bg-[#FBF7EF] p-4 rounded-2xl flex justify-center border border-[#E8DFC8]">
          <div
            id="printable-purchase-receipt"
            className="bg-white text-black p-4 font-mono text-xs rounded-lg shadow-md border border-neutral-300"
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
                  <span>{formatArticleItem(it)}</span>
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
            className="flex-1 py-2.5 px-3 rounded-xl border border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF] font-bold text-xs transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Mandar a Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
