import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  Package,
  User,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { Order, OrderItem, OrderStatus } from '../types';
import { formatCurrency, formatBoliviaPhone } from '../lib/storage';
import { PackagingQuickSelector } from './PackagingQuickSelector';

interface OrderEditScreenProps {
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

export const OrderEditScreen: React.FC<OrderEditScreenProps> = ({
  order,
  onSave,
  onCancel,
}) => {
  const [cliente, setCliente] = useState(order.cliente);
  const [telefono, setTelefono] = useState(order.telefono);
  const [lugarEntrega, setLugarEntrega] = useState(order.lugarEntrega);
  const [observaciones, setObservaciones] = useState(order.observaciones);
  const [estado, setEstado] = useState<OrderStatus>(order.estado);
  const [productos, setProductos] = useState<OrderItem[]>(
    order.productos.map((p) => ({ ...p }))
  );
  const [pagado, setPagado] = useState<number>(order.pagado);

  const calculatedTotal = productos.reduce(
    (sum, item) => sum + (item.cantidad || 0) * (item.precioUnitario || 0),
    0
  );
  const calculatedSaldo = Math.max(0, calculatedTotal - (pagado || 0));

  const handleUpdateProduct = (
    id: string,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setProductos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleAddProduct = () => {
    const newItem: OrderItem = {
      id: `item_${Date.now()}_${productos.length}`,
      nombre: '',
      variante: '',
      cantidad: 1,
      precioUnitario: 0,
    };
    setProductos((prev) => [...prev, newItem]);
  };

  const handleRemoveProduct = (id: string) => {
    if (productos.length === 1) {
      setProductos([
        {
          id: `item_${Date.now()}`,
          nombre: '',
          variante: '',
          cantidad: 1,
          precioUnitario: 0,
        },
      ]);
      return;
    }
    setProductos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      alert('Por favor ingresa el nombre del cliente.');
      return;
    }

    const updated: Order = {
      ...order,
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      lugarEntrega: lugarEntrega.trim(),
      observaciones: observaciones.trim(),
      estado,
      productos: productos.map((p) => ({
        ...p,
        nombre: p.nombre.trim() || 'Artículo',
        variante: p.variante.trim(),
        cantidad: Math.max(1, p.cantidad),
        precioUnitario: Math.max(0, p.precioUnitario),
      })),
      total: calculatedTotal,
      pagado: Math.max(0, pagado),
      saldo: calculatedSaldo,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
  };

  return (
    <div id="order-edit-container" className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          id="edit-back-btn"
          onClick={onCancel}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancelar</span>
        </button>

        <h1 className="text-xl font-bold text-white font-['Outfit',sans-serif]">
          Editar Pedido #{order.orderNumber}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Location Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-cyan-400" />
            Datos del Cliente
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Teléfono / WhatsApp</span>
                <span className="text-[10px] text-cyan-400 font-bold">🇧🇴 +591</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={() => {
                  if (telefono.trim()) {
                    setTelefono(formatBoliviaPhone(telefono));
                  }
                }}
                placeholder="Ej. 71234567 o +591 71234567"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lugar de Entrega
              </label>
              <input
                type="text"
                value={lugarEntrega}
                onChange={(e) => setLugarEntrega(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Observaciones / Notas
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
              />
            </div>

            {/* Order Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado del Pedido
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as OrderStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
              >
                <option value="Abierto">Abierto</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              Artículos ({productos.length})
            </h2>
            <button
              type="button"
              onClick={handleAddProduct}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Artículo</span>
            </button>
          </div>

          <div className="space-y-3">
            {productos.map((prod, index) => {
              const subtotal = (prod.cantidad || 0) * (prod.precioUnitario || 0);
              return (
                <div
                  key={prod.id}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={prod.nombre}
                      onChange={(e) =>
                        handleUpdateProduct(prod.id, 'nombre', e.target.value)
                      }
                      placeholder="Nombre del artículo"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(prod.id)}
                      className="p-2 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={prod.variante}
                      onChange={(e) =>
                        handleUpdateProduct(prod.id, 'variante', e.target.value)
                      }
                      placeholder="Presentación / Variante (ej. Box de 24 u., Medio Box 24...)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                    <PackagingQuickSelector
                      value={prod.variante}
                      onChange={(preset) => handleUpdateProduct(prod.id, 'variante', preset)}
                      theme="indigo"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 items-center pt-1">

                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProduct(
                            prod.id,
                            'cantidad',
                            Math.max(0, (prod.cantidad || 0) - 1)
                          )
                        }
                        className="w-7 h-7 flex items-center justify-center text-slate-300 text-sm font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={prod.cantidad === 0 ? '' : prod.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateProduct(
                            prod.id,
                            'cantidad',
                            val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0)
                          );
                        }}
                        placeholder="0"
                        className="w-full bg-transparent text-center text-xs font-bold text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProduct(
                            prod.id,
                            'cantidad',
                            (prod.cantidad || 0) + 1
                          )
                        }
                        className="w-7 h-7 flex items-center justify-center text-slate-300 text-sm font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                        Bs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={prod.precioUnitario === 0 ? '' : (prod.precioUnitario || '')}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateProduct(
                            prod.id,
                            'precioUnitario',
                            val === '' ? 0 : Math.max(0, parseFloat(val) || 0)
                          );
                        }}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Calculation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Finanzas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total
              </span>
              <span className="text-xl font-black text-white">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                Pagado
              </label>
              <input
                type="number"
                min="0"
                value={pagado === 0 ? '' : pagado}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setPagado(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                }}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-base font-bold text-emerald-300 outline-none"
              />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Saldo
              </span>
              <span
                className={`text-xl font-black ${
                  calculatedSaldo <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {formatCurrency(calculatedSaldo)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 py-4 px-6 rounded-xl font-bold text-base text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </form>
    </div>
  );
};
