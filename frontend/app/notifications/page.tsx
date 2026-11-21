"use client";

import { BellOff, CheckCheck, Circle } from "lucide-react";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import RequireRole from "@components/layout/RequireRole";
import { NotificationItem } from "@components/notifications/NotificationItem";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { Pagination } from "@components/ui/DataTable";
import { EmptyState, ErrorState, TableSkeleton } from "@components/ui/Feedback";
import { Segmented } from "@components/ui/Form";
import { PageContainer, PageHeader } from "@components/ui/Layout";
import { useToast } from "@components/ui/Toast";
import { fetcher } from "@services/apiClient";
import { markAllNotificationsRead, markNotificationRead } from "@services/notifications";
import useI18n from "@hooks/useI18n";
import { Notification, Page } from "@types";

const PAGE_SIZE = 15;

const NotificationsPage = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const { mutate: globalMutate } = useSWRConfig();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const key: [string, Record<string, string | number | boolean>] = ["/notifications", { unreadOnly: filter === "unread", page, size: PAGE_SIZE }];
  const { data, error, isLoading, mutate } = useSWR<Page<Notification>>(key, fetcher, { keepPreviousData: true });
  const unread = useSWR<{ count: number }>("/notifications/unread-count", fetcher);

  const refreshAll = async () => {
    await Promise.all([mutate(), unread.mutate(), globalMutate((k) => Array.isArray(k) && k[0] === "/notifications")]);
  };

  const open = async (notification: Notification) => {
    if (notification.read) return;
    try {
      await markNotificationRead(notification.id);
      await refreshAll();
    } catch {
      // Opening the link matters more than the read flag; ignore a failure here.
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const result = await markAllNotificationsRead();
      await refreshAll();
      notify(t("notifications.markedAll", { count: result.updated }));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : t("errors.generic"), "error");
    } finally {
      setBusy(false);
    }
  };

  const count = unread.data?.count ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title={t("notifications.title")}
        description={count > 0 ? t("notifications.unreadCount", { count }) : t("notifications.allRead")}
        actions={
          <Button variant="secondary" icon={<CheckCheck className="h-4 w-4" />} onClick={markAll} loading={busy} disabled={count === 0}>
            {t("notifications.markAllRead")}
          </Button>
        }
      />
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <Segmented<"all" | "unread">
            label={t("notifications.filter")}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(0);
            }}
            options={[
              { value: "all", label: t("common.all") },
              { value: "unread", label: t("notifications.unreadOnly"), icon: <Circle className="h-2 w-2 fill-teal-500 text-teal-500" aria-hidden /> },
            ]}
          />
        </div>
        {isLoading && !data ? (
          <TableSkeleton rows={6} columns={2} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !data || data.content.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-5 w-5" />}
            title={filter === "unread" ? t("notifications.emptyUnread") : t("notifications.emptyTitle")}
            description={filter === "unread" ? t("notifications.emptyUnreadHint") : t("notifications.emptyAll")}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.content.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={open}
                  action={
                    !notification.read && (
                      <Button variant="ghost" size="sm" onClick={() => void open(notification)}>
                        {t("notifications.markRead")}
                      </Button>
                    )
                  }
                />
              ))}
            </ul>
            {data.totalPages > 1 && (
              <Pagination page={data.page} pageCount={data.totalPages} total={data.totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
            )}
          </>
        )}
      </Card>
    </PageContainer>
  );
};

const Page_ = () => (
  <RequireRole>
    <NotificationsPage />
  </RequireRole>
);

export default Page_;
