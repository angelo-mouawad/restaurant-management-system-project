"use client";

import React, { useEffect, useState } from "react";
import { User } from "@types";
import useErrorMessage from "@hooks/useErrorMessage";
import useI18n from "@hooks/useI18n";

type Props = {
  isOpen: boolean;
  users: User[];
  initialUserId?: number;
  onClose: () => void;
  onConfirm: (userId: number) => void;
};

const ScheduleModal: React.FC<Props> = ({
  isOpen,
  users,
  initialUserId,
  onClose,
  onConfirm,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [errorMessage, setErrorMessage] = useErrorMessage("");
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(initialUserId ?? "");
      setErrorMessage("");
    }
  }, [isOpen, initialUserId, setErrorMessage]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedUserId === "") {
      setErrorMessage(t("schedule.modal.missingUser"));
      return;
    }

    setErrorMessage("");
    onConfirm(selectedUserId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg transition-colors duration-300 dark:bg-slate-800"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-100">
          {t("schedule.modal.title")}
        </h3>

        {errorMessage && <p className="mb-2 text-sm text-red-500">{errorMessage}</p>}

        <select
          value={selectedUserId}
          onChange={(event) =>
            setSelectedUserId(event.target.value ? Number(event.target.value) : "")
          }
          className="mb-2 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">{t("schedule.modal.selectUser")}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.username})
            </option>
          ))}
        </select>

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

export default ScheduleModal;
