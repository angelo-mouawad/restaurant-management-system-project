"use client";

import { ArrowRightLeft, Boxes, ClipboardList, Truck } from "lucide-react";
import { TabNav } from "@components/ui/Layout";
import useI18n from "@hooks/useI18n";

const StockTabs = () => {
  const { t } = useI18n();
  return (
    <TabNav
      tabs={[
        { href: "/stock", label: t("stock.tabs.items"), icon: <Boxes className="h-4 w-4" aria-hidden /> },
        { href: "/stock/movements", label: t("stock.tabs.movements"), icon: <ArrowRightLeft className="h-4 w-4" aria-hidden /> },
        { href: "/stock/orders", label: t("stock.tabs.orders"), icon: <ClipboardList className="h-4 w-4" aria-hidden /> },
        { href: "/stock/suppliers", label: t("stock.tabs.suppliers"), icon: <Truck className="h-4 w-4" aria-hidden /> },
      ]}
    />
  );
};

export default StockTabs;
