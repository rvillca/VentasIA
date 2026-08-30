export interface OrderItem {
  id: string;
  nombre: string;
  variante: string;
  cantidad: number;
  precioUnitario: number;
}

export type OrderStatus = 'Abierto' | 'Entregado';

export interface Order {
  id: string;
  orderNumber: number; // e.g. 1, 2, 3
  cliente: string;
  telefono: string;
  lugarEntrega: string;
  observaciones: string;
  productos: OrderItem[];
  total: number;
  pagado: number;
  saldo: number;
  estado: OrderStatus;
  createdAt: string; // ISO date string
  updatedAt: string;
  rawTranscription?: string;
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

export type ActiveTab = 'list' | 'new' | 'detail' | 'edit' | 'supply';
