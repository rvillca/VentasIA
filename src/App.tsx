import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OrdersListScreen } from './components/OrdersListScreen';
import { NewOrderScreen } from './components/NewOrderScreen';
import { OrderDetailScreen } from './components/OrderDetailScreen';
import { OrderEditScreen } from './components/OrderEditScreen';
import { ShippingPendingScreen } from './components/ShippingPendingScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { ComprasScreen } from './components/ComprasScreen';
import { LoginScreen } from './components/LoginScreen';
import { Order, Purchase, ActiveTab } from './types';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  updateOrderInFirestore,
  markOrderAsDeliveredInFirestore,
  reopenOrderInFirestore,
  anularOrderInFirestore,
  deleteOrderFromFirestore,
  INITIAL_SAMPLE_ORDERS,
  subscribeToPurchases,
  savePurchaseToFirestore,
  INITIAL_SAMPLE_PURCHASES,
} from './lib/storage';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const {
    currentUser,
    userProfile,
    loading,
    canAccessCompras,
    canAdminResetPasswords,
    canViewReports,
    isJefe,
    isSupervisor,
    isComprador,
  } = useAuth();
  const { isDark } = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
      showToast(`¡Venta #${newOrder.orderNumber} registrada y guardada con éxito!`);
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
    const dispatcherName = userProfile?.displayName || userProfile?.email || 'Usuario';
    const dispatcherUid = userProfile?.uid || '';

    try {
      if (nextStatus === 'Entregado') {
        await markOrderAsDeliveredInFirestore(orderId, dispatcherName, dispatcherUid);
        showToast(`Pedido #${target.orderNumber} marcado como Entregado por ${dispatcherName}`);
      } else {
        await reopenOrderInFirestore(orderId);
        showToast(`Pedido #${target.orderNumber} reabierto como Pendiente de Envío`);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showToast('Error al cambiar estado del pedido.');
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

  // If loading auth state
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center space-y-3 ${
        isDark ? 'bg-[#0F1B3C] text-slate-100' : 'bg-[#FBF7EF] text-[#1A2B5C]'
      }`}>
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${
          isDark ? 'border-[#FF6FA5]' : 'border-[#1A2B5C]'
        }`} />
        <p className={`text-sm font-semibold font-['Outfit',sans-serif] ${
          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
        }`}>
          Iniciando Importadora Chiquiminisos...
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
    <div className={`min-h-screen flex flex-col font-sans pb-20 sm:pb-8 transition-colors duration-200 ${
      isDark ? 'bg-[#0F1B3C] text-white' : 'bg-[#FBF7EF] text-[#1A2B5C]'
    }`}>
      {/* Header with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'new') setSelectedOrderId(null);
        }}
        orders={orders}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast-notification"
          className={`fixed top-20 right-4 left-4 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm font-semibold max-w-sm border transition-all ${
            isDark
              ? 'bg-[#16234F] border-[#223368] text-white shadow-[#0F1B3C]/80'
              : 'bg-white border-[#E8DFC8] text-[#1A2B5C] shadow-slate-300/60'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
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
              setActiveTab('new');
            }}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {/* Tab 2: Pendientes de Envío & Despacho */}
        {activeTab === 'shipping' && (
          <ShippingPendingScreen
            orders={orders}
            onSelectOrder={(order) => {
              setSelectedOrderId(order.id);
              setActiveTab('detail');
            }}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {/* Tab 3: Nueva Venta */}
        {activeTab === 'new' && (
          <NewOrderScreen
            orders={orders}
            onSaveOrder={handleSaveNewOrder}
            onCancel={() => {
              setActiveTab('list');
            }}
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
    </div>
  );
}

