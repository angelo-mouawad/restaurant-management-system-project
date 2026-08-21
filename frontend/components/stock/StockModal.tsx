"use client";

import React, { useEffect, useState } from "react";
import useErrorMessage from "@hooks/useErrorMessage";
import useI18n from "@hooks/useI18n";

type ActionType = "add" | "remove" | "new" | null;

type Props = {
  isOpen: boolean;
  actionType: ActionType;
  onClose: () => void;
  onConfirm: (data: { name?: string; quantity: number }) => void;
};

const StockModal: React.FC<Props> = ({ isOpen, actionType, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState("");
  const [itemName, setItemName] = useState("");
  const [errorMessage, setErrorMessage] = useErrorMessage("");
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setItemName("");
      setErrorMessage("");
    }
  }, [isOpen, setErrorMessage]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (inputValue.trim() === "" || (actionType === "new" && itemName.trim() === "")) {
      setErrorMessage(
        actionType === "new" ? t("stock.modal.missingFields") : t("stock.modal.missingQuantity")
      );
      return;
    }

    const quantity = Number.parseInt(inputValue, 10);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage(t("stock.modal.invalidQuantity"));
      return;
    }

    setErrorMessage("");
    onConfirm({ name: itemName.trim(), quantity });
  };

  const title =
    actionType === "add"
      ? t("stock.modal.add")
      : actionType === "remove"
        ? t("stock.modal.remove")
        : t("stock.modal.create");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg transition-colors duration-300 dark:bg-slate-800"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</h3>

        {errorMessage && <p className="mb-2 text-sm text-red-500">{errorMessage}</p>}

        {actionType === "new" && (
          <input
            type="text"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            placeholder={t("stock.modal.namePlaceholder")}
          />
        )}

        <input
          type="number"
          min={1}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          placeholder={t("stock.modal.quantityPlaceholder")}
        />

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-teal-500 px-4 py-2 text-white transition-colors hover:bg-teal-600"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockModal;
