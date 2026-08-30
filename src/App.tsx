import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OrdersListScreen } from './components/OrdersListScreen';
import { NewOrderScreen } from './components/NewOrderScreen';
import { OrderDetailScreen } from './components/OrderDetailScreen';
import { OrderEditScreen } from './components/OrderEditScreen';
import { WholesalerSupplyScreen } from './components/WholesalerSupplyScreen';
import { BackupModal } from './components/BackupModal';
import { VikaAssistantModal } from './components/VikaAssistantModal';
import { Order, ActiveTab } from './types';
import { getStoredOrders, saveOrdersToStorage } from './lib/storage';
import { Mic, ListOrdered, Sparkles, CheckCircle2, Bot } from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isVikaOpen, setIsVikaOpen] = useState(false);
  const [vikaDraftOrder, setVikaDraftOrder] = useState<{
    productos?: Array<{
      nombre: string;
      variante: string;
      cantidad: number;
      precioUnitario: number;
    }>;
    pagado?: number;
    observaciones?: string;
    cliente?: string;
    telefono?: string;
    lugarEntrega?: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load orders on initial mount
  useEffect(() => {
    const loaded = getStoredOrders();
    setOrders(loaded);
  }, []);

  // Sync to local storage whenever orders change
  const updateOrdersState = (newOrders: Order[]) => {
    setOrders(newOrders);
    saveOrdersToStorage(newOrders);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handlers
  const handleSaveNewOrder = (newOrder: Order) => {
    const updated = [newOrder, ...orders];
    updateOrdersState(updated);
    setSelectedOrderId(newOrder.id);
    setActiveTab('detail');
    setVikaDraftOrder(null);
    showToast(`¡Pedido #${newOrder.orderNumber} guardado correctamente!`);
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    const updated = orders.map((o) =>
      o.id === updatedOrder.id ? updatedOrder : o
    );
    updateOrdersState(updated);
    setActiveTab('detail');
    showToast(`Pedido #${updatedOrder.orderNumber} actualizado.`);
  };

  const handleToggleStatus = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        const nextStatus = o.estado === 'Abierto' ? 'Entregado' : 'Abierto';
        return {
          ...o,
          estado: nextStatus as 'Abierto' | 'Entregado',
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    updateOrdersState(updated);
    const target = orders.find((o) => o.id === orderId);
    if (target) {
      const nextText = target.estado === 'Abierto' ? 'Entregado' : 'Abierto';
      showToast(`Pedido #${target.orderNumber} marcado como ${nextText}`);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    updateOrdersState(updated);
    setSelectedOrderId(null);
    setActiveTab('list');
    showToast('Pedido eliminado correctamente.');
  };

  const handleTransferVikaDraft = (draft: {
    productos: Array<{
      nombre: string;
      variante: string;
      cantidad: number;
      precioUnitario: number;
    }>;
    pagado?: number;
    observaciones?: string;
  }) => {
    setVikaDraftOrder(draft);
    setActiveTab('new');
    setIsVikaOpen(false);
    showToast('¡VIKA preparó los artículos en tu nuevo pedido!');
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
      {/* Header with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'new') setSelectedOrderId(null);
        }}
        orders={orders}
        onOpenBackup={() => setIsBackupOpen(false)}
        onOpenVika={() => setIsVikaOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast-notification"
          className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-cyan-950 border border-cyan-400/60 text-cyan-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm font-semibold max-w-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 w-full">
        {activeTab === 'list' && (
          <OrdersListScreen
            orders={orders}
            onSelectOrder={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('detail');
            }}
            onNewOrder={() => {
              setVikaDraftOrder(null);
              setActiveTab('new');
            }}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {activeTab === 'supply' && (
          <WholesalerSupplyScreen
            orders={orders}
            onSelectOrder={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('detail');
            }}
          />
        )}

        {activeTab === 'new' && (
          <NewOrderScreen
            orders={orders}
            initialDraft={vikaDraftOrder}
            onSaveOrder={handleSaveNewOrder}
            onCancel={() => {
              setVikaDraftOrder(null);
              setActiveTab('list');
            }}
            onOpenVika={() => setIsVikaOpen(true)}
          />
        )}

        {activeTab === 'detail' && selectedOrder && (
          <OrderDetailScreen
            order={selectedOrder}
            onBack={() => setActiveTab('list')}
            onEdit={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('edit');
            }}
            onToggleStatus={(id) => handleToggleStatus(id)}
            onDelete={handleDeleteOrder}
          />
        )}

        {activeTab === 'edit' && selectedOrder && (
          <OrderEditScreen
            order={selectedOrder}
            onSave={handleUpdateOrder}
            onCancel={() => setActiveTab('detail')}
          />
        )}
      </main>

      {/* Floating Action Button for VIKA Assistant */}
      <div className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 print:hidden">
        <button
          id="global-vika-floating-btn"
          onClick={() => setIsVikaOpen(true)}
          className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-2xl shadow-purple-900/50 hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-purple-500/20"
          title="Hablar con VIKA, tu agente IA de pedidos y dinero"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-purple-900 animate-ping" />
          </div>
          <span className="font-extrabold text-sm tracking-wide font-['Outfit',sans-serif]">
            VIKA <span className="text-[10px] font-mono text-cyan-200">IA</span>
          </span>
        </button>
      </div>

      {/* Backup & Persistence Modal */}
      {isBackupOpen && (
        <BackupModal
          orders={orders}
          onClose={() => setIsBackupOpen(false)}
          onRestoreOrders={(restored) => {
            updateOrdersState(restored);
            setIsBackupOpen(false);
            showToast(`¡Se restauraron ${restored.length} pedidos!`);
          }}
        />
      )}

      {/* VIKA Assistant Modal */}
      <VikaAssistantModal
        isOpen={isVikaOpen}
        onClose={() => setIsVikaOpen(false)}
        orders={orders}
        activeTab={activeTab}
        onTransferToNewOrder={handleTransferVikaDraft}
        onSaveDirectOrder={(newOrder) => {
          const updated = [newOrder, ...orders];
          updateOrdersState(updated);
          showToast(`¡Pedido #${newOrder.orderNumber} registrado con éxito por VIKA!`);
        }}
      />
    </div>
  );
}
