import React, { useRef, useState } from 'react';
import { Download, Upload, X, Check, AlertCircle, HardDrive, RefreshCw } from 'lucide-react';
import { Order } from '../types';
import { INITIAL_SAMPLE_ORDERS } from '../lib/storage';

interface BackupModalProps {
  orders: Order[];
  onClose: () => void;
  onRestoreOrders: (restored: Order[]) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  orders,
  onClose,
  onRestoreOrders,
}) => {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export JSON file
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(orders, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `ventasIA_pedidos_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Respaldo exportado exitosamente a tu dispositivo.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error al exportar respaldo: ' + err.message });
    }
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          onRestoreOrders(parsed);
          setMessage({
            type: 'success',
            text: `Se restauraron ${parsed.length} pedidos correctamente.`,
          });
        } else {
          setMessage({ type: 'error', text: 'El archivo no contiene una lista válida de pedidos.' });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Archivo JSON inválido: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  // Reset to initial sample orders
  const handleLoadSamples = () => {
    onRestoreOrders(INITIAL_SAMPLE_ORDERS);
    setMessage({
      type: 'success',
      text: 'Se han cargado los pedidos de demostración.',
    });
  };

  return (
    <div
      id="backup-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="backup-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
              Gestión de Datos y Respaldo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tus pedidos se guardan <strong className="text-cyan-300">permanentemente</strong> en tu navegador. Puedes descargar una copia de seguridad en JSON o importarla en cualquier momento.
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Respaldo JSON ({orders.length} pedidos)</span>
          </button>

          {/* Import Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Importar Archivo de Respaldo (.json)</span>
          </button>

          {/* Sample Demo Data */}
          <button
            onClick={handleLoadSamples}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cargar Ejemplos de TikTok</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
