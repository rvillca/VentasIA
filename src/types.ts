export interface OrderItem {
  id: string;
  nombre: string;
  variante: string;
  cantidad: number;
  precioUnitario: number;
}

export type OrderStatus = 'Abierto' | 'Entregado' | 'Anulado';

export type UserRole = 'jefe' | 'supervisor' | 'comprador' | 'vendedor';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  createdBy?: string;
  disabled?: boolean;
  comprasAccess?: boolean;
}

export interface Order {
  id: string;
  orderNumber: number;
  cliente: string;
  telefono: string;
  lugarEntrega: string;
  observaciones: string;
  productos: OrderItem[];
  total: number;
  pagado: number;
  saldo: number;
  estado: OrderStatus;
  vendedorUid?: string;
  vendedorNombre?: string;
  anuladoPor?: string;
  motivoAnulacion?: string;
  anuladoAt?: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  rawTranscription?: string;
}

export interface PurchaseItem {
  id: string;
  nombre: string;
  categoria?: string;
  variante?: string;
  cantidad: number;
  costoUnitario: number; // in Bs.
  subtotal: number;
}

export type PurchaseStatus = 'Pagado' | 'Saldo Pendiente' | 'Anulado';

export interface Purchase {
  id: string;
  purchaseNumber: number; // e.g. 1 -> #C-001
  proveedor: string;
  telefonoProveedor?: string;
  numeroFacturaRecibo?: string;
  metodoPago: 'Efectivo' | 'Transferencia' | 'QR' | 'Crédito';
  fechaCompra: string; // ISO date string
  productos: PurchaseItem[];
  total: number;
  pagado: number;
  saldo: number;
  estado: PurchaseStatus;
  compradorUid?: string;
  compradorNombre?: string;
  observaciones?: string;
  anuladoPor?: string;
  motivoAnulacion?: string;
  anuladoAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiParsedOrderData {
  cliente: string;
  telefono: string;
  lugarEntrega: string;
  observaciones: string;
  pagado?: number;
  productos: {
    nombre: string;
    variante: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  rawTranscription?: string;
}

export type ActiveTab = 'list' | 'new' | 'detail' | 'edit' | 'supply' | 'compras' | 'reports' | 'users';

