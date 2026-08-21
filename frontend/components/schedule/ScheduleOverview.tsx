"use client";

import React, { useCallback, useEffect, useState } from "react";
import { assignUserToScheduleItem, removeUserFromScheduleItem } from "@services/ScheduleService";
import { createNotification } from "@services/NotificationService";
import { ScheduleItem, User } from "@types";
import useAuth from "@hooks/useAuth";
import useI18n from "@hooks/useI18n";
import ScheduleModal from "./ScheduleModal";
import ScheduleTable from "./ScheduleTable";

type Props = {
  items: ScheduleItem[];
  users: User[];
  loadError?: string | null;
};

const ScheduleOverview: React.FC<Props> = ({ items: initialItems, users, loadError }) => {
  const { user, isLoading } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<ScheduleItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const notify = useCallback(async (username: string, message: string) => {
    try {
      await createNotification(username, message, null);
    } catch (error) {
      console.error("Failed to send notification", error);
    }
  }, []);

  const openModal = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    const isFilled = Boolean(item.user?.name || item.name);
    if (!isAdmin && isFilled) {
      return;
    }
    setActionError("");
    setCurrentIndex(index);
    setIsModalOpen(true);
  };

  const handleConfirm = async (userId: number) => {
    if (currentIndex === null) {
      return;
    }

    const item = items[currentIndex];
    if (!item) {
      setIsModalOpen(false);
      return;
    }

    try {
      const updatedItem = await assignUserToScheduleItem(item.id, userId);
      setItems((previous) =>
        previous.map((entry, index) => (index === currentIndex ? updatedItem : entry))
      );
      setActionError("");
      setIsModalOpen(false);

      const assignedUser = users.find((candidate) => candidate.id === userId);
      if (assignedUser?.username) {
        await notify(
          assignedUser.username,
          `You have been assigned to the following shift: ${item.day} - ${item.shift}`
        );
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("common.actionFailed"));
    }
  };

  const handleRemove = async (index: number) => {
    if (!isAdmin) {
      return;
    }

    const item = items[index];
    if (!item) {
      return;
    }

    const removedUser = item.user;

    try {
      const updatedItem = await removeUserFromScheduleItem(item.id);
      setItems((previous) =>
        previous.map((entry, entryIndex) => (entryIndex === index ? updatedItem : entry))
      );
      setActionError("");

      if (removedUser?.username) {
        await notify(
          removedUser.username,
          `You have been removed from the following shift: ${item.day} - ${item.shift}`
        );
      }
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

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-teal-500">{t("schedule.title")}</h2>

      {loadError && <p className="mb-4 text-red-500">{t("schedule.failed")}</p>}
      {actionError && <p className="mb-4 text-red-500">{actionError}</p>}

      {items.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{t("schedule.noItems")}</p>
      ) : (
        <ScheduleTable
          items={items}
          onOpenModal={openModal}
          onRemove={isAdmin ? handleRemove : undefined}
          showRemove={isAdmin}
        />
      )}

      {isModalOpen && currentIndex !== null && (
        <ScheduleModal
          isOpen={isModalOpen}
          users={users}
          initialUserId={items[currentIndex]?.user?.id}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default ScheduleOverview;
