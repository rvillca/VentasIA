import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Archive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Undo2,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  archivePaidRecordsBeforeDate,
  permanentlyDeleteArchivedRecords,
  fetchArchivedRecords,
  fetchArchivedCounts,
  unarchiveOrderInFirestore,
  unarchivePurchaseInFirestore,
  formatCurrency,
  formatBoliviaPhone,
  fetchAllOrdersForBackup,
  fetchAllPurchasesForBackup,
} from '../lib/storage';
import {
  downloadFullSystemBackupExcel,
  downloadFullSystemBackupCSV,
  BackupResult,
} from '../lib/backup';
import { Order, Purchase } from '../types';

export const DatabaseMaintenanceScreen: React.FC = () => {
  const { isJefe } = useAuth();
  const { isDark } = useTheme();

  // Overview stats
  const [totalOrdersInDb, setTotalOrdersInDb] = useState<number | null>(null);
  const [totalPurchasesInDb, setTotalPurchasesInDb] = useState<number | null>(null);
  const [archivedCounts, setArchivedCounts] = useState<{
    archivedOrdersCount: number;
    archivedPurchasesCount: number;
  }>({ archivedOrdersCount: 0, archivedPurchasesCount: 0 });

  // Archived records list
  const [archivedRecords, setArchivedRecords] = useState<{
    orders: Order[];
    purchases: Purchase[];
  }>({ orders: [], purchases: [] });
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [activeArchivedTab, setActiveArchivedTab] = useState<'orders' | 'purchases'>('orders');

  // Backup state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<BackupResult | null>(null);

  // Archiving state
  const [cutoffDate, setCutoffDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default 30 days ago
    return d.toISOString().split('T')[0];
  });
  const [archivingLoading, setArchivingLoading] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{
    archivedOrders: number;
    archivedPurchases: number;
    skippedOrdersWithBalance: number;
    skippedPurchasesWithBalance: number;
    totalProcessed: number;
  } | null>(null);

  // Deletion modal state (Double confirmation)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteOrdersCheck, setDeleteOrdersCheck] = useState(true);
  const [deletePurchasesCheck, setDeletePurchasesCheck] = useState(true);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    deletedOrders: number;
    deletedPurchases: number;
  } | null>(null);

  // General notices
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  // Initial load
  const loadDatabaseMetrics = async () => {
    try {
      setLoadingArchived(true);
      const [allOrders, allPurchases, counts, archivedData] = await Promise.all([
        fetchAllOrdersForBackup(),
        fetchAllPurchasesForBackup(),
        fetchArchivedCounts(),
        fetchArchivedRecords(),
      ]);

      setTotalOrdersInDb(allOrders.length);
      setTotalPurchasesInDb(allPurchases.length);
      setArchivedCounts(counts);
      setArchivedRecords(archivedData);
    } catch (err: any) {
      console.error('Error loading database maintenance metrics:', err);
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    if (isJefe) {
      loadDatabaseMetrics();
    }
  }, [isJefe]);

  // Handler: Full Backup Excel
  const handleDownloadExcelBackup = async () => {
    try {
      setDownloadingExcel(true);
      setBackupSuccess(null);
      const result = await downloadFullSystemBackupExcel();
      setBackupSuccess(result);
      showToast('success', `Backup Excel descargado con éxito: ${result.filename}`);
    } catch (err: any) {
      console.error('Error downloading Excel backup:', err);
      showToast('error', `Error al generar backup: ${err.message}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Handler: Full Backup CSV
  const handleDownloadCsvBackup = async () => {
    try {
      setDownloadingCsv(true);
      setBackupSuccess(null);
      const result = await downloadFullSystemBackupCSV();
      setBackupSuccess(result);
      showToast('success', `Backup CSV generado con éxito: ${result.filename}`);
    } catch (err: any) {
      console.error('Error downloading CSV backup:', err);
      showToast('error', `Error al generar backup: ${err.message}`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Handler: Archivar Registros Saldados
  const handleArchiveRecords = async () => {
    if (!cutoffDate) {
      showToast('error', 'Por favor selecciona una fecha límite para el archivado.');
      return;
    }

    try {
      setArchivingLoading(true);
      setArchiveResult(null);

      const cutoffIso = new Date(`${cutoffDate}T23:59:59.999`).toISOString();
      const res = await archivePaidRecordsBeforeDate(cutoffIso);

      setArchiveResult(res);
      await loadDatabaseMetrics();

      showToast(
        'success',
        `Proceso completado: ${res.archivedOrders} ventas y ${res.archivedPurchases} compras archivadas.`
      );
    } catch (err: any) {
      console.error('Error archiving records:', err);
      showToast('error', `Error al archivar: ${err.message}`);
    } finally {
      setArchivingLoading(false);
    }
  };

  // Handler: Desarchivar Pedido
  const handleUnarchiveOrder = async (orderId: string, orderNumber: number) => {
    try {
      await unarchiveOrderInFirestore(orderId);
      showToast('success', `Venta #${orderNumber} reactivada y desarchivada.`);
      await loadDatabaseMetrics();
    } catch (err: any) {
      showToast('error', 'Error al desarchivar venta.');
    }
  };

  // Handler: Desarchivar Compra
  const handleUnarchivePurchase = async (purchaseId: string, purchaseNumber: number) => {
    try {
      await unarchivePurchaseInFirestore(purchaseId);
      showToast('success', `Compra #C-${purchaseNumber} reactivada y desarchivada.`);
      await loadDatabaseMetrics();
    } catch (err: any) {
      showToast('error', 'Error al desarchivar compra.');
    }
  };

  // Handler: Eliminación Definitiva (Modal action)
  const handlePermanentDelete = async () => {
    if (deleteConfirmationText.trim() !== 'ELIMINAR') {
      showToast('error', 'Debes escribir exactamente la palabra ELIMINAR para confirmar.');
      return;
    }

    if (!deleteOrdersCheck && !deletePurchasesCheck) {
      showToast('error', 'Debes seleccionar al menos una categoría para eliminar.');
      return;
    }

    try {
      setDeletingLoading(true);
      const res = await permanentlyDeleteArchivedRecords({
        deleteOrders: deleteOrdersCheck,
        deletePurchases: deletePurchasesCheck,
      });

      setDeleteResult(res);
      setShowDeleteModal(false);
      setDeleteConfirmationText('');
      await loadDatabaseMetrics();

      showToast(
        'success',
        `Eliminación definitiva completada: ${res.deletedOrders} ventas y ${res.deletedPurchases} compras eliminadas permanentemente.`
      );
    } catch (err: any) {
      console.error('Error deleting archived records:', err);
      showToast('error', `Error al eliminar registros: ${err.message}`);
    } finally {
      setDeletingLoading(false);
    }
  };

  // Preset date pickers for convenience
  const setPresetDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setCutoffDate(d.toISOString().split('T')[0]);
  };

  // Access check
  if (!isJefe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black font-['Outfit',sans-serif]">
          Acceso Restringido - Solo Rol Admin / Jefe
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          El módulo de Mantenimiento de Base de Datos contiene operaciones avanzadas de respaldo,
          archivado y depuración exclusivas para la administración central.
        </p>
      </div>
    );
  }

  const totalArchived = archivedCounts.archivedOrdersCount + archivedCounts.archivedPurchasesCount;

  return (
    <div id="database-maintenance-screen" className="space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 ${
            notice.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
              : notice.type === 'error'
              ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
              : 'bg-sky-500 text-white border-sky-600 shadow-sky-500/20'
          }`}
        >
          {notice.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${
          isDark
            ? 'bg-gradient-to-br from-[#16234F] to-[#0F1B3C] border-[#223368]'
            : 'bg-gradient-to-br from-white to-[#FBF7EF] border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-[#FF6FA5]/20 text-[#FF6FA5] border border-[#FF6FA5]/30">
                👑 Exclusivo Admin / Jefa
              </span>
              <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Panel de Integridad & Almacenamiento
              </span>
            </div>
            <h1
              className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              Mantenimiento de Base de Datos
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Respalda todos los registros del sistema, archiva pedidos y compras antiguas saldadas,
              y depura registros archivados de forma controlada.
            </p>
          </div>

          <button
            onClick={loadDatabaseMetrics}
            disabled={loadingArchived}
            className={`self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer ${
              isDark
                ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingArchived ? 'animate-spin' : ''}`} />
            <span>Actualizar Métricas</span>
          </button>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#223368]/40 dark:border-[#223368] border-[#E8DFC8]">
          <div
            className={`p-3 rounded-2xl border ${
              isDark ? 'bg-[#0F1B3C]/80 border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Ventas en BD
            </span>
            <span className={`text-lg sm:text-xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              {totalOrdersInDb !== null ? totalOrdersInDb : '...'}
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              isDark ? 'bg-[#0F1B3C]/80 border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Compras en BD
            </span>
            <span className={`text-lg sm:text-xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              {totalPurchasesInDb !== null ? totalPurchasesInDb : '...'}
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              isDark ? 'bg-[#0F1B3C]/80 border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block text-amber-500`}>
              Ventas Archivadas
            </span>
            <span className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] text-amber-500">
              {archivedCounts.archivedOrdersCount}
            </span>
          </div>

          <div
            className={`p-3 rounded-2xl border ${
              isDark ? 'bg-[#0F1B3C]/80 border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block text-amber-500`}>
              Compras Archivadas
            </span>
            <span className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] text-amber-500">
              {archivedCounts.archivedPurchasesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Action Modules: 1. Backup, 2. Archive, 3. Permanent Deletion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MODULE 1: BACKUP COMPLETO */}
        <div
          className={`border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">
                  Paso Recomendado
                </span>
                <h2
                  className={`text-base sm:text-lg font-bold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  1. Backup Completo
                </h2>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Exporta <strong>TODOS</strong> los datos históricos del sistema (ventas, clientes,
              compras, envíos y desglose de artículos) sin importar filtros de fecha.
            </p>

            <div
              className={`p-3 rounded-2xl border text-[11px] space-y-1 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368] text-slate-300' : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Incluye 7 pestañas organizadas en Excel:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                <li>Ventas y abonos completos</li>
                <li>Detalle de artículos y empaque</li>
                <li>Compras a mayoristas e insumos</li>
                <li>Directorio y saldos de clientes</li>
                <li>Envíos, logística y transportistas</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadExcelBackup}
              disabled={downloadingExcel}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                isDark
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              {downloadingExcel ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generando Libro Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Backup Completo (Excel .xlsx)</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsvBackup}
              disabled={downloadingCsv}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                  : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              {downloadingCsv ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Descargar en Formato CSV</span>
            </button>

            {backupSuccess && (
              <p className="text-[10px] text-center text-emerald-500 font-bold truncate">
                ✓ Último: {backupSuccess.filename}
              </p>
            )}
          </div>
        </div>

        {/* MODULE 2: ARCHIVAR REGISTROS ANTIGUOS */}
        <div
          className={`border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                  Optimización
                </span>
                <h2
                  className={`text-base sm:text-lg font-bold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  2. Archivar Registros Antiguos
                </h2>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Archiva pedidos y compras históricas para que dejen de cargar en las listas activas y
              agilizar el sistema.
            </p>

            {/* STRICT ZERO-BALANCE RULE BADGE */}
            <div
              className={`p-3 rounded-2xl border text-[11px] space-y-1.5 ${
                isDark
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>REGLA ESTRICTA DE SALDO CERO:</span>
              </div>
              <p className="text-[10.5px] leading-relaxed opacity-90">
                ÚNICAMENTE se archivan pedidos/compras con <strong>Saldo = 0 Bs</strong>. Los
                registros con saldo pendiente mayor a 0 <strong>NUNCA</strong> se archivan
                automáticamente, sin importar su antigüedad.
              </p>
            </div>

            {/* Cutoff Date Selection */}
            <div className="space-y-2">
              <label
                className={`block text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Archivar todo antes de la fecha:
              </label>
              <div className="relative">
                <Calendar
                  className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                />
                <input
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-amber-400'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-amber-500'
                  }`}
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPresetDate(15)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                      : 'bg-white hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  Hace 15 días
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(30)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                      : 'bg-white hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  Hace 1 mes
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(90)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                      : 'bg-white hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  Hace 3 meses
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(180)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#9AA6C9]'
                      : 'bg-white hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  Hace 6 meses
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleArchiveRecords}
              disabled={archivingLoading}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
              }`}
            >
              {archivingLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Procesando Archivado...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Archivar Registros Saldados</span>
                </>
              )}
            </button>

            {archiveResult && (
              <div
                className={`p-2.5 rounded-xl border text-[10.5px] space-y-0.5 ${
                  isDark
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                <p className="font-bold">✓ Archivado completado con éxito:</p>
                <p>• {archiveResult.archivedOrders} pedidos saldados archivados</p>
                <p>• {archiveResult.archivedPurchases} compras saldadas archivadas</p>
                {(archiveResult.skippedOrdersWithBalance > 0 ||
                  archiveResult.skippedPurchasesWithBalance > 0) && (
                  <p className="text-amber-600 dark:text-amber-300 font-semibold pt-0.5">
                    🛡️ {archiveResult.skippedOrdersWithBalance + archiveResult.skippedPurchasesWithBalance}{' '}
                    registros con saldo pendiente protegidos y activos.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODULE 3: ELIMINACIÓN DEFINITIVA */}
        <div
          className={`border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 border-rose-500/30 ${
            isDark ? 'bg-[#16234F] border-rose-500/30' : 'bg-white border-rose-200'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">
                  Acción Irreversible
                </span>
                <h2
                  className={`text-base sm:text-lg font-bold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  3. Eliminación Definitiva
                </h2>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Función separada para eliminar permanentemente de Firestore los registros que{' '}
              <strong>YA fueron archivados</strong>.
            </p>

            <div
              className={`p-3 rounded-2xl border text-[11px] space-y-1.5 ${
                isDark
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>ADVERTENCIA CRÍTICA:</span>
              </div>
              <p className="text-[10.5px] leading-relaxed opacity-90">
                Esta acción elimina los registros para siempre de la base de datos. Requiere doble
                confirmación con la palabra "ELIMINAR" y se recomienda haber descargado un backup
                previo.
              </p>
            </div>

            {/* Current archived status */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>
                Total listos para depurar:
              </span>
              <span className="font-black text-rose-500 font-['Outfit',sans-serif]">
                {totalArchived} archivados
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteModal(true);
              }}
              disabled={totalArchived === 0}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                totalArchived === 0
                  ? 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                  : isDark
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {totalArchived === 0
                  ? 'Sin Registros Archivados'
                  : 'Eliminar Registros Archivados'}
              </span>
            </button>

            {deleteResult && (
              <p className="text-[10px] text-center text-rose-500 font-bold">
                ✓ Eliminados: {deleteResult.deletedOrders} ventas, {deleteResult.deletedPurchases} compras.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: EXPLORADOR DE REGISTROS ARCHIVADOS (Visualización y Opción de Restaurar) */}
      <div
        className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-[#223368]/40 dark:border-[#223368] border-[#E8DFC8]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500" />
              <h3
                className={`text-base sm:text-lg font-bold font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Explorador de Registros Archivados
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Consulta los registros que fueron archivados o restáuralos a las listas normales si los
              necesitas activos nuevamente.
            </p>
          </div>

          {/* Sub-tabs: Ventas vs Compras */}
          <div
            className={`flex items-center p-1 rounded-2xl border ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <button
              onClick={() => setActiveArchivedTab('orders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeArchivedTab === 'orders'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                    : 'bg-[#1A2B5C] text-white'
                  : isDark
                  ? 'text-[#9AA6C9] hover:text-white'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <span>Ventas Archivadas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-black/10">
                {archivedRecords.orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveArchivedTab('purchases')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeArchivedTab === 'purchases'
                  ? isDark
                    ? 'bg-[#FFA26B] text-[#7C2D12]'
                    : 'bg-[#EA580C] text-white'
                  : isDark
                  ? 'text-[#9AA6C9] hover:text-white'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <span>Compras Archivadas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-black/10">
                {archivedRecords.purchases.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Orders table */}
        {activeArchivedTab === 'orders' && (
          <div className="space-y-3">
            {archivedRecords.orders.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  No hay ventas archivadas actualmente.
                </p>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Todas las ventas registradas se encuentran activas en el sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#223368]/40 dark:border-[#223368] border-[#E8DFC8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDark
                          ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                          : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                      }`}
                    >
                      <th className="p-3 font-bold">Nº Pedido</th>
                      <th className="p-3 font-bold">Fecha Venta</th>
                      <th className="p-3 font-bold">Cliente</th>
                      <th className="p-3 font-bold">Total</th>
                      <th className="p-3 font-bold">Saldo</th>
                      <th className="p-3 font-bold">Estado</th>
                      <th className="p-3 font-bold">Fecha Archivado</th>
                      <th className="p-3 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#223368]/30 dark:divide-[#223368] divide-[#E8DFC8]">
                    {archivedRecords.orders.map((ord) => (
                      <tr
                        key={ord.id}
                        className={`hover:bg-amber-500/5 transition ${
                          isDark ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <td className="p-3 font-bold text-amber-500">#{ord.orderNumber}</td>
                        <td className="p-3 text-[11px]">
                          {new Date(ord.createdAt).toLocaleDateString('es-BO')}
                        </td>
                        <td className="p-3 font-medium truncate max-w-[150px]">
                          {ord.cliente || 'Sin nombre'}
                        </td>
                        <td className="p-3 font-semibold">{formatCurrency(ord.total)}</td>
                        <td className="p-3 font-bold text-emerald-500">
                          {formatCurrency(ord.saldo || 0)} (Saldado)
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            Archivado
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {ord.fechaArchivado
                            ? new Date(ord.fechaArchivado).toLocaleDateString('es-BO')
                            : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleUnarchiveOrder(ord.id, ord.orderNumber)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 ml-auto transition cursor-pointer ${
                              isDark
                                ? 'bg-[#0F1B3C] hover:bg-emerald-500/20 border-[#223368] text-emerald-400'
                                : 'bg-white hover:bg-emerald-50 border-[#E8DFC8] text-emerald-700'
                            }`}
                            title="Restaurar este pedido a la lista activa de Ventas"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>Desarchivar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Purchases table */}
        {activeArchivedTab === 'purchases' && (
          <div className="space-y-3">
            {archivedRecords.purchases.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  No hay compras archivadas actualmente.
                </p>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Todas las compras a proveedores se encuentran activas en el sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#223368]/40 dark:border-[#223368] border-[#E8DFC8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDark
                          ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9]'
                          : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                      }`}
                    >
                      <th className="p-3 font-bold">Nº Compra</th>
                      <th className="p-3 font-bold">Fecha</th>
                      <th className="p-3 font-bold">Proveedor</th>
                      <th className="p-3 font-bold">Total</th>
                      <th className="p-3 font-bold">Saldo</th>
                      <th className="p-3 font-bold">Estado</th>
                      <th className="p-3 font-bold">Fecha Archivado</th>
                      <th className="p-3 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#223368]/30 dark:divide-[#223368] divide-[#E8DFC8]">
                    {archivedRecords.purchases.map((pur) => (
                      <tr
                        key={pur.id}
                        className={`hover:bg-amber-500/5 transition ${
                          isDark ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        <td className="p-3 font-bold text-amber-500">#C-{pur.purchaseNumber}</td>
                        <td className="p-3 text-[11px]">
                          {new Date(pur.fechaCompra || pur.createdAt).toLocaleDateString('es-BO')}
                        </td>
                        <td className="p-3 font-medium truncate max-w-[150px]">{pur.proveedor}</td>
                        <td className="p-3 font-semibold">{formatCurrency(pur.total)}</td>
                        <td className="p-3 font-bold text-emerald-500">
                          {formatCurrency(pur.saldo || 0)} (Saldado)
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            Archivado
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400">
                          {pur.fechaArchivado
                            ? new Date(pur.fechaArchivado).toLocaleDateString('es-BO')
                            : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleUnarchivePurchase(pur.id, pur.purchaseNumber)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 ml-auto transition cursor-pointer ${
                              isDark
                                ? 'bg-[#0F1B3C] hover:bg-emerald-500/20 border-[#223368] text-emerald-400'
                                : 'bg-white hover:bg-emerald-50 border-[#E8DFC8] text-emerald-700'
                            }`}
                            title="Restaurar esta compra a la lista activa de Compras"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>Desarchivar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 5: VALIDACIÓN TÉCNICA DE CONSULTAS FIRESTORE (Item 4) */}
      <div
        className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#FF6FA5]" />
          <h3
            className={`text-base font-bold font-['Outfit',sans-serif] ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            Validación Técnica de Consultas Firestore
          </h3>
        </div>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
          Para garantizar la máxima velocidad y escalabilidad con miles de documentos, las consultas
          en <strong>Ventas</strong>, <strong>Envíos</strong> y <strong>Reportes</strong> aplican
          filtros de fecha directamente en el servidor de Firestore (cláusulas{' '}
          <code className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[11px]">where('createdAt', '&gt;=', startIso)</code>).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div
            className={`p-3 rounded-2xl border text-xs space-y-1 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Módulo de Ventas</span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Carga por defecto únicamente las ventas del día actual o periodo seleccionado vía servidor.
            </p>
          </div>

          <div
            className={`p-3 rounded-2xl border text-xs space-y-1 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Módulo de Envíos</span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Consulta pedidos abiertos y entregados del mes en curso directo desde Firestore.
            </p>
          </div>

          <div
            className={`p-3 rounded-2xl border text-xs space-y-1 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Módulo de Reportes</span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filtros por semana, mes o rango personalizado ejecutados en base de datos sin descargar todo el historial.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL DE DOBLE CONFIRMACIÓN PARA ELIMINACIÓN DEFINITIVA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border-rose-500/40 animate-in zoom-in-95 ${
              isDark ? 'bg-[#16234F]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">
                  Peligro · Acción Irreversible
                </span>
                <h3
                  className={`text-lg font-black font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  Eliminación Definitiva de Registros
                </h3>
              </div>
            </div>

            {/* Warning Message */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                isDark
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <p className="font-bold">
                ⚠️ ADVERTENCIA: Esta acción eliminará permanentemente de Firestore los registros
                archivados seleccionados. Esta operación NO se puede deshacer.
              </p>
              <p className="text-[11px] opacity-90">
                Asegúrate de haber descargado un <strong>Backup Completo</strong> antes de continuar.
              </p>

              {/* Quick backup button right inside warning */}
              <button
                type="button"
                onClick={handleDownloadExcelBackup}
                disabled={downloadingExcel}
                className="mt-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-rose-900 border border-rose-300 hover:bg-rose-100 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Backup Ahora (Por seguridad)</span>
              </button>
            </div>

            {/* Selection Checkboxes */}
            <div className="space-y-2 text-xs">
              <span className={`block font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Selecciona qué deseas eliminar permanentemente:
              </span>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition ${
                  deleteOrdersCheck
                    ? isDark
                      ? 'bg-rose-500/10 border-rose-500/40 text-white'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-slate-400'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={deleteOrdersCheck}
                  onChange={(e) => setDeleteOrdersCheck(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold">
                  Eliminar permanentemente {archivedCounts.archivedOrdersCount} ventas archivadas
                </span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition ${
                  deletePurchasesCheck
                    ? isDark
                      ? 'bg-rose-500/10 border-rose-500/40 text-white'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-slate-400'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={deletePurchasesCheck}
                  onChange={(e) => setDeletePurchasesCheck(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold">
                  Eliminar permanentemente {archivedCounts.archivedPurchasesCount} compras archivadas
                </span>
              </label>
            </div>

            {/* Double confirmation input */}
            <div className="space-y-2">
              <label
                className={`block text-xs font-bold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Escribe la palabra <strong className="text-rose-500 uppercase">ELIMINAR</strong> para
                desbloquear el botón:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Escribe ELIMINAR aquí"
                className={`w-full border-2 rounded-xl py-2.5 px-3 text-sm font-bold text-center tracking-widest uppercase focus:outline-none transition ${
                  deleteConfirmationText === 'ELIMINAR'
                    ? 'border-rose-500 text-rose-500 focus:ring-2 focus:ring-rose-500'
                    : isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] text-slate-300 hover:bg-[#0F1B3C]'
                    : 'border-[#E8DFC8] text-slate-700 hover:bg-[#FBF7EF]'
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={
                  deleteConfirmationText.trim() !== 'ELIMINAR' ||
                  deletingLoading ||
                  (!deleteOrdersCheck && !deletePurchasesCheck)
                }
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  deleteConfirmationText.trim() === 'ELIMINAR' && !deletingLoading
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                {deletingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando de Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Eliminación Definitiva</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
