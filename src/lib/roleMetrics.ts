import { Order, Purchase } from '../types';

export interface MonthlyStats {
  currentMonthCount: number;
  prevMonthCount: number;
  deliveredCount: number;
  pendingBalanceCount: number;
  motivationalMessage: string;
  isImprovement: boolean;
}

/**
 * Calculates days elapsed between a date string and now
 */
export function getDaysElapsed(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Formats days elapsed in natural Spanish
 */
export function formatDaysElapsed(days: number): { text: string; severity: 'recent' | 'warning' | 'urgent' } {
  if (days <= 0) {
    return { text: 'Hoy', severity: 'recent' };
  }
  if (days === 1) {
    return { text: 'Ayer (1 día)', severity: 'recent' };
  }
  if (days <= 3) {
    return { text: `Hace ${days} días`, severity: 'recent' };
  }
  if (days <= 10) {
    return { text: `Hace ${days} días`, severity: 'warning' };
  }
  return { text: `Hace ${days} días`, severity: 'urgent' };
}

/**
 * Computes monthly order counts (resetting on the 1st of each month)
 * and compares with previous month.
 */
export function computeMonthlySalesStats(orders: Order[]): MonthlyStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Previous month info
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const validOrders = orders.filter((o) => o.estado !== 'Anulado');

  let currentMonthCount = 0;
  let prevMonthCount = 0;
  let deliveredCount = 0;
  let pendingBalanceCount = 0;

  validOrders.forEach((o) => {
    const rawDate = o.createdAt || (o as any).fechaCreacion;
    const date = rawDate ? new Date(rawDate) : null;

    if (date && !isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = date.getMonth();

      if (y === currentYear && m === currentMonth) {
        currentMonthCount++;
        if (o.estado === 'Entregado') {
          deliveredCount++;
        }
        if (o.saldo > 0) {
          pendingBalanceCount++;
        }
      } else if (y === prevYear && m === prevMonth) {
        prevMonthCount++;
      }
    } else {
      // Fallback if date is missing: count in current month
      currentMonthCount++;
      if (o.estado === 'Entregado') deliveredCount++;
      if (o.saldo > 0) pendingBalanceCount++;
    }
  });

  // Check persistent backup for previous month count (in case DB only holds recent orders)
  const storageKey = `ventasia_monthly_sales_${prevYear}_${prevMonth}`;
  if (prevMonthCount > 0) {
    try {
      localStorage.setItem(storageKey, String(prevMonthCount));
    } catch {}
  } else {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          prevMonthCount = parsed;
        }
      }
    } catch {}
  }

  // Also save current month count to storage for future month transitions
  try {
    localStorage.setItem(`ventasia_monthly_sales_${currentYear}_${currentMonth}`, String(currentMonthCount));
  } catch {}

  const isImprovement = prevMonthCount > 0 && currentMonthCount > prevMonthCount;
  let motivationalMessage = '';

  if (prevMonthCount > 0) {
    if (currentMonthCount > prevMonthCount) {
      motivationalMessage = `¡Vas mejor que el mes pasado! 🎉 (${currentMonthCount} vs ${prevMonthCount} ventas)`;
    } else if (currentMonthCount === prevMonthCount) {
      motivationalMessage = `🎯 ¡Empataste el mes anterior con ${currentMonthCount} ventas! A superarlo 🔥`;
    } else {
      motivationalMessage = `📊 Mes anterior: ${prevMonthCount} ventas registradas · ¡A por la meta! 💪`;
    }
  } else {
    if (currentMonthCount > 0) {
      motivationalMessage = `✨ ${currentMonthCount} venta(s) este mes · ¡Excelente inicio de mes! 🚀`;
    } else {
      motivationalMessage = `📅 Contador de ventas reiniciado este mes · ¡Mucho éxito hoy! ✨`;
    }
  }

  return {
    currentMonthCount,
    prevMonthCount,
    deliveredCount,
    pendingBalanceCount,
    motivationalMessage,
    isImprovement,
  };
}

/**
 * Computes monthly purchase counts (resetting on the 1st of each month)
 * and compares with previous month for Buyer.
 */
export function computeMonthlyPurchasesStats(purchases: Purchase[]): MonthlyStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const validPurchases = purchases.filter((p) => p.estado !== 'Anulado');

  let currentMonthCount = 0;
  let prevMonthCount = 0;
  let deliveredCount = 0; // for purchases: fully paid
  let pendingBalanceCount = 0; // for purchases: with pending balance

  validPurchases.forEach((p) => {
    const rawDate = p.fechaCompra || p.createdAt;
    const date = rawDate ? new Date(rawDate) : null;

    if (date && !isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = date.getMonth();

      if (y === currentYear && m === currentMonth) {
        currentMonthCount++;
        if (p.estado === 'Pagado') deliveredCount++;
        if (p.saldo > 0) pendingBalanceCount++;
      } else if (y === prevYear && m === prevMonth) {
        prevMonthCount++;
      }
    } else {
      currentMonthCount++;
      if (p.estado === 'Pagado') deliveredCount++;
      if (p.saldo > 0) pendingBalanceCount++;
    }
  });

  const storageKey = `ventasia_monthly_purchases_${prevYear}_${prevMonth}`;
  if (prevMonthCount > 0) {
    try {
      localStorage.setItem(storageKey, String(prevMonthCount));
    } catch {}
  } else {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          prevMonthCount = parsed;
        }
      }
    } catch {}
  }

  try {
    localStorage.setItem(`ventasia_monthly_purchases_${currentYear}_${currentMonth}`, String(currentMonthCount));
  } catch {}

  const isImprovement = prevMonthCount > 0 && currentMonthCount > prevMonthCount;
  let motivationalMessage = '';

  if (prevMonthCount > 0) {
    if (currentMonthCount > prevMonthCount) {
      motivationalMessage = `¡Vas mejor que el mes pasado! 🎉 (${currentMonthCount} vs ${prevMonthCount} compras)`;
    } else if (currentMonthCount === prevMonthCount) {
      motivationalMessage = `📦 ¡Mismo volumen del mes pasado (${currentMonthCount} compras)!`;
    } else {
      motivationalMessage = `📊 Mes anterior: ${prevMonthCount} compras registradas`;
    }
  } else {
    if (currentMonthCount > 0) {
      motivationalMessage = `✨ ${currentMonthCount} compra(s) este mes · ¡Buen ritmo de abastecimiento! 📦`;
    } else {
      motivationalMessage = `📅 Contador de compras reiniciado este mes · ¡Listo para registrar mercadería! ✨`;
    }
  }

  return {
    currentMonthCount,
    prevMonthCount,
    deliveredCount,
    pendingBalanceCount,
    motivationalMessage,
    isImprovement,
  };
}
