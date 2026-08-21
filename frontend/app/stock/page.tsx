import { cookies } from "next/headers";
import StockOverview from "@components/stock/StockOverview";
import { getStockItems } from "@services/StockService";
import { StockItem } from "@types";

export const dynamic = "force-dynamic";

const StockPage = async () => {
  const cookieHeader = (await cookies()).toString();

  let initialItems: StockItem[] = [];
  let loadError: string | null = null;

  try {
    initialItems = await getStockItems({ headers: { Cookie: cookieHeader } });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load stock.";
  }

  return (
    <div className="px-6 pb-20 pt-10 lg:px-20">
      <StockOverview initialItems={initialItems} loadError={loadError} />
    </div>
  );
};

export default StockPage;
