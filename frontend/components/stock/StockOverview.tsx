"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  addStockItem,
  decreaseStockItem,
  increaseStockItem,
  removeStockItem,
} from "@services/StockService";
import { createNotification } from "@services/NotificationService";
import { StockItem } from "@types";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import StockModal from "./StockModal";
import StockTable from "./StockTable";

type ActionType = "add" | "remove" | "new";

type Props = {
  initialItems: StockItem[];
  loadError?: string | null;
};

const LOW_STOCK_THRESHOLD = 10;
const NOTIFIED_ITEMS_KEY = "notifiedLowStockItems";

const readNotifiedItems = (): Set<number> => {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const stored = window.localStorage.getItem(NOTIFIED_ITEMS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is number => typeof value === "number"))
      : new Set();
  } catch {
    return new Set();
  }
};

const writeNotifiedItems = (notified: Set<number>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(NOTIFIED_ITEMS_KEY, JSON.stringify(Array.from(notified)));
  } catch {
    return;
  }
};

const StockOverview: React.FC<Props> = ({ initialItems, loadError }) => {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionError, setActionError] = useState("");
  const isNotifying = useRef(false);

  const isAdmin = user?.role === "admin";
  const username = user?.username;

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!username || !isAdmin || items.length === 0 || isNotifying.current) {
      return;
    }

    const notifyLowStock = async () => {
      isNotifying.current = true;
      const notified = readNotifiedItems();
      let changed = false;

      for (const item of items) {
        const alreadyNotified = notified.has(item.id);

        if (item.quantity < LOW_STOCK_THRESHOLD && !alreadyNotified) {
          try {
            await createNotification(username, `${item.name} has stock lower than 10.`, item.id);
            notified.add(item.id);
            changed = true;
          } catch (error) {
            console.error("Failed to create low stock notification", error);
          }
        } else if (item.quantity >= LOW_STOCK_THRESHOLD && alreadyNotified) {
          notified.delete(item.id);
          changed = true;
        }
      }

      if (changed) {
        writeNotifiedItems(notified);
      }
      isNotifying.current = false;
    };

    notifyLowStock();
  }, [items, username, isAdmin]);

  const openModal = useCallback((index: number | null, type: ActionType) => {
    setActionError("");
    setCurrentIndex(index);
    setActionType(type);
    setIsModalOpen(true);
  }, []);

  const handleModalConfirm = async ({ name, quantity }: { name?: string; quantity: number }) => {
    try {
      if (actionType === "new") {
        const created = await addStockItem((name || "").trim(), quantity);
        setItems((previous) => [...previous, created]);
      } else if (currentIndex !== null && items[currentIndex]) {
        const target = items[currentIndex];

        if (actionType === "add") {
          const updated = await increaseStockItem(target.id, quantity);
          setItems((previous) =>
            previous.map((item, index) => (index === currentIndex ? updated : item))
          );
        } else if (actionType === "remove") {
          const updated = await decreaseStockItem(target.id, quantity);
          if (updated.quantity <= 0) {
            await removeStockItem(target.id);
            setItems((previous) => previous.filter((_, index) => index !== currentIndex));
          } else {
            setItems((previous) =>
              previous.map((item, index) => (index === currentIndex ? updated : item))
            );
          }
        }
      }

      setActionError("");
      setIsModalOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("common.actionFailed"));
    }
  };

  if (isLoading) {
    return <p className="text-slate-500 dark:text-slate-400">{t("common.loading")}</p>;
  }

  if (!user) {
    return <p className="text-red-500">{t("common.accessDeniedLogin")}</p>;
  }

  if (!isAdmin) {
    return <p className="text-red-500">{t("common.accessDeniedAdmin")}</p>;
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-teal-500">{t("stock.title")}</h2>

      {loadError && <p className="mb-4 text-red-500">{t("stock.failed")}</p>}
      {actionError && <p className="mb-4 text-red-500">{actionError}</p>}

      {items.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{t("stock.noItems")}</p>
      ) : (
        <StockTable items={items} onOpenModal={openModal} />
      )}

      <div className="mt-4 flex justify-end pr-4">
        <button
          type="button"
          onClick={() => openModal(null, "new")}
          className="rounded-md bg-green-500 px-4 py-2 text-white transition hover:bg-green-600"
        >
          {t("stock.table.addNew")}
        </button>
      </div>

      <StockModal
        isOpen={isModalOpen}
        actionType={actionType}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
};

export default StockOverview;
