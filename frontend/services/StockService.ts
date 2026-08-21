import { apiFetch } from "@services/apiClient";
import { StockItem } from "@types";

export const getStockItems = async (init?: RequestInit): Promise<StockItem[]> =>
  apiFetch<StockItem[]>("/stockItem", "Failed to fetch stock items.", {
    method: "GET",
    ...init,
  });

export const addStockItem = async (name: string, quantity: number): Promise<StockItem> =>
  apiFetch<StockItem>("/stockItem", "Failed to add stock item.", {
    method: "POST",
    body: JSON.stringify({ name, quantity }),
  });

export const increaseStockItem = async (id: number, amount: number): Promise<StockItem> =>
  apiFetch<StockItem>(
    `/stockItem/${encodeURIComponent(id)}/increase`,
    "Failed to increase stock item.",
    { method: "POST", body: JSON.stringify({ amount }) }
  );

export const decreaseStockItem = async (id: number, amount: number): Promise<StockItem> =>
  apiFetch<StockItem>(
    `/stockItem/${encodeURIComponent(id)}/decrease`,
    "Failed to decrease stock item.",
    { method: "POST", body: JSON.stringify({ amount }) }
  );

export const removeStockItem = async (id: number, init?: RequestInit): Promise<void> => {
  await apiFetch<void>(
    `/stockItem/${encodeURIComponent(id)}/remove`,
    "Failed to remove stock item.",
    { method: "DELETE", ...init }
  );
};
