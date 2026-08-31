import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OrdersListScreen } from './components/OrdersListScreen';
import { NewOrderScreen } from './components/NewOrderScreen';
import { OrderDetailScreen } from './components/OrderDetailScreen';
import { OrderEditScreen } from './components/OrderEditScreen';
import { WholesalerSupplyScreen } from './components/WholesalerSupplyScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { ComprasScreen } from './components/ComprasScreen';
import { LoginScreen } from './components/LoginScreen';
import { VikaAssistantModal } from './components/VikaAssistantModal';
import { Order, Purchase, ActiveTab } from './types';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  updateOrderInFirestore,
  anularOrderInFirestore,
  deleteOrderFromFirestore,
  INITIAL_SAMPLE_ORDERS,
  subscribeToPurchases,
  savePurchaseToFirestore,
  INITIAL_SAMPLE_PURCHASES,
} from './lib/storage';
import { useAuth } from './contexts/AuthContext';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function App() {
  const {
    currentUser,
    userProfile,
    loading,
    canManageUsers,
    canViewReports,
    canAccessCompras,
    canAdminResetPasswords,
    isJefe,
    isSupervisor,
    isComprador,
  } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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

  // If the user is specifically a Comprador, set their default landing tab to 'compras'
  useEffect(() => {
    if (isComprador && activeTab === 'list') {
      setActiveTab('compras');
    }
  }, [isComprador]);

  // Real-time Firestore sync for Orders
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToOrders(
      async (loadedOrders) => {
        if (loadedOrders.length === 0 && isJefe) {
          // If fresh database, seed initial demo orders for the Jefe
          for (const ord of INITIAL_SAMPLE_ORDERS) {
            await saveOrderToFirestore(ord).catch(() => {});
          }
        } else {
          setOrders(loadedOrders);
        }
      },
      (err) => {
        console.error('Orders sync error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isJefe]);

  // Real-time Firestore sync for Purchases (Compras)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToPurchases(
      async (loadedPurchases) => {
        if (loadedPurchases.length === 0 && (isJefe || isSupervisor)) {
          // Seed initial demo purchase records if empty
          for (const pur of INITIAL_SAMPLE_PURCHASES) {
            await savePurchaseToFirestore(pur).catch(() => {});
          }
        } else {
          setPurchases(loadedPurchases);
        }
      },
      (err) => {
        console.error('Purchases sync error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isJefe, isSupervisor]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handlers for Orders Firestore CRUD & Actions
  const handleSaveNewOrder = async (newOrder: Order) => {
    try {
      await saveOrderToFirestore(newOrder);
      setSelectedOrderId(newOrder.id);
      setActiveTab('detail');
      setVikaDraftOrder(null);
      showToast(`¡Venta #${newOrder.orderNumber} registrada y guardada en BD!`);
    } catch (err: any) {
      console.error('Error saving order:', err);
      showToast('Error al guardar pedido en la base de datos.');
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    try {
      await updateOrderInFirestore(updatedOrder.id, updatedOrder);
      setActiveTab('detail');
      showToast(`Venta #${updatedOrder.orderNumber} actualizada.`);
    } catch (err: any) {
      console.error('Error updating order:', err);
      showToast('Error al actualizar pedido.');
    }
  };

  const handleToggleStatus = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    if (target.estado === 'Anulado') {
      showToast('No se puede cambiar el estado de una venta anulada.');
      return;
    }

    const nextStatus = target.estado === 'Abierto' ? 'Entregado' : 'Abierto';
    try {
      await updateOrderInFirestore(orderId, {
        estado: nextStatus as 'Abierto' | 'Entregado',
      });
      showToast(`Pedido #${target.orderNumber} marcado como ${nextStatus}`);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleAnularOrder = async (orderId: string, motivo: string) => {
    try {
      const sellerName = userProfile?.displayName || userProfile?.email || 'Vendedor';
      await anularOrderInFirestore(orderId, sellerName, motivo);
      showToast('Venta anulada correctamente.');
    } catch (err) {
      console.error('Error anulando venta:', err);
      showToast('Error al anular la venta.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrderFromFirestore(orderId);
      setSelectedOrderId(null);
      setActiveTab('list');
      showToast('Venta eliminada permanentemente de la base de datos.');
    } catch (err) {
      console.error('Error deleting order:', err);
      showToast('Error al eliminar la venta.');
    }
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

  // If loading auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400 font-['Outfit',sans-serif]">
          Iniciando ventasIA Chiquiminisos...
        </p>
      </div>
    );
  }

  // If not logged in, render the login & registration screen
  if (!currentUser) {
    return <LoginScreen />;
  }

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
        {/* Tab 1: Lista de Ventas */}
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

        {/* Tab 2: Al Mayorista */}
        {activeTab === 'supply' && (
          <WholesalerSupplyScreen
            orders={orders}
            onSelectOrder={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('detail');
            }}
          />
        )}

        {/* Tab 3: Nueva Venta */}
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

        {/* Tab 4: MÓDULO DE COMPRAS (Independiente para Jefe, Supervisor y Comprador) */}
        {activeTab === 'compras' && canAccessCompras && (
          <ComprasScreen purchases={purchases} />
        )}

        {/* Detail Screen */}
        {activeTab === 'detail' && selectedOrder && (
          <OrderDetailScreen
            order={selectedOrder}
            onBack={() => setActiveTab('list')}
            onEdit={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('edit');
            }}
            onToggleStatus={(id) => handleToggleStatus(id)}
            onAnular={handleAnularOrder}
            onDelete={handleDeleteOrder}
          />
        )}

        {/* Edit Screen */}
        {activeTab === 'edit' && selectedOrder && (
          <OrderEditScreen
            order={selectedOrder}
            onSave={handleUpdateOrder}
            onCancel={() => setActiveTab('detail')}
          />
        )}

        {/* Tab 5: Reportes y Dashboards (Jefe, Supervisor y Comprador) */}
        {activeTab === 'reports' && canViewReports && (
          <ReportsScreen orders={orders} purchases={purchases} />
        )}

        {/* Tab 6: Gestión de Personal / Usuarios (Jefe y Supervisor) */}
        {activeTab === 'users' && canAdminResetPasswords && (
          <UserManagementScreen />
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

      {/* VIKA Assistant Modal */}
      <VikaAssistantModal
        isOpen={isVikaOpen}
        onClose={() => setIsVikaOpen(false)}
        orders={orders}
        activeTab={activeTab}
        onTransferToNewOrder={handleTransferVikaDraft}
        onSaveDirectOrder={async (newOrder) => {
          await handleSaveNewOrder(newOrder);
          showToast(`¡Venta #${newOrder.orderNumber} registrada con éxito por VIKA!`);
        }}
      />
    </div>
  );
}
