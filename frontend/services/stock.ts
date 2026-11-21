import { api } from "@services/apiClient";
import {
  Movement,
  MovementType,
  PurchaseOrder,
  PurchaseOrderInput,
  StockItem,
  StockItemInput,
  Supplier,
  SupplierInput,
} from "@types";

export const createItem = (input: StockItemInput) => api<StockItem>("/stock/items", { method: "POST", body: input });

export const updateItem = (id: number, input: StockItemInput) =>
  api<StockItem>(`/stock/items/${id}`, { method: "PUT", body: input });

export const archiveItem = (id: number) => api<StockItem>(`/stock/items/${id}/archive`, { method: "POST" });

export const restoreItem = (id: number) => api<StockItem>(`/stock/items/${id}/restore`, { method: "POST" });

export const recordMovement = (id: number, type: MovementType, quantity: number, reason: string | null) =>
  api<Movement>(`/stock/items/${id}/movements`, { method: "POST", body: { type, quantity, reason } });

export const createSupplier = (input: SupplierInput) =>
  api<Supplier>("/stock/suppliers", { method: "POST", body: input });

export const updateSupplier = (id: number, input: SupplierInput) =>
  api<Supplier>(`/stock/suppliers/${id}`, { method: "PUT", body: input });

export const deleteSupplier = (id: number) => api<void>(`/stock/suppliers/${id}`, { method: "DELETE" });

export const createOrder = (input: PurchaseOrderInput) =>
  api<PurchaseOrder>("/stock/orders", { method: "POST", body: input });

export const updateOrder = (id: number, input: PurchaseOrderInput) =>
  api<PurchaseOrder>(`/stock/orders/${id}`, { method: "PUT", body: input });

export const orderAction = (id: number, action: "order" | "receive" | "cancel") =>
  api<PurchaseOrder>(`/stock/orders/${id}/${action}`, { method: "POST" });

export const deleteOrder = (id: number) => api<void>(`/stock/orders/${id}`, { method: "DELETE" });
