"use client";

import { BellOff } from "lucide-react";
import useSWR from "swr";
import { ButtonLink } from "@components/ui/Button";
import { Card, CardHeader } from "@components/ui/Card";
import { EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { NotificationItem } from "@components/notifications/NotificationItem";
import { fetcher } from "@services/apiClient";
import useI18n from "@hooks/useI18n";
import { Notification, Page } from "@types";

const RecentNotifications = () => {
  const { t } = useI18n();
  const { data, error, isLoading, mutate } = useSWR<Page<Notification>>(["/notifications", { size: 5 }], fetcher);

  return (
    <Card>
      <CardHeader
        title={t("home.recentNotifications")}
        action={
          <ButtonLink href="/notifications" variant="ghost" size="sm">
            {t("common.viewAll")}
          </ButtonLink>
        }
      />
      {isLoading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : !data || data.content.length === 0 ? (
        <EmptyState icon={<BellOff className="h-5 w-5" />} title={t("notifications.emptyTitle")} description={t("notifications.emptyAll")} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {data.content.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} compact />
          ))}
        </ul>
      )}
    </Card>
  );
};

export default RecentNotifications;
