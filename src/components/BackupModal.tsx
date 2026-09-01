import React, { useRef, useState } from 'react';
import { Download, Upload, X, Check, AlertCircle, HardDrive, RefreshCw } from 'lucide-react';
import { Order } from '../types';
import { INITIAL_SAMPLE_ORDERS } from '../lib/storage';
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark } = useTheme();
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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        id="backup-modal-content"
        className={`border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-2">
            <HardDrive className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
            <h2 className={`text-lg font-bold font-['Outfit',sans-serif] ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}>
              Gestión de Datos y Respaldo
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition cursor-pointer ${
              isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? isDark
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isDark
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Export JSON */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              Exportar Copia de Seguridad
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Descarga un archivo .json con los {orders.length} pedidos registrados.
            </p>
            <button
              onClick={handleExport}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo JSON</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              Restaurar desde Archivo
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Carga un archivo de respaldo previo para sincronizar pedidos.
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                  : 'bg-white hover:bg-[#E8DFC8] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Seleccionar Archivo JSON</span>
            </button>
          </div>

          {/* Reset Demo Samples */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Datos de Demostración
              </h4>
              <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Carga pedidos iniciales de ejemplo
              </p>
            </div>
            <button
              onClick={handleLoadSamples}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-[#9AA6C9] border-[#223368]'
                  : 'bg-white hover:bg-[#E8DFC8] text-[#78716C] border-[#E8DFC8]'
              }`}
            >
              Recargar
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition cursor-pointer ${
              isDark
                ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
