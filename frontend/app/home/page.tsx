import { cookies } from "next/headers";
import HomeOverview from "@components/home/HomeOverview";
import { getScheduleItems } from "@services/ScheduleService";
import { getStockItems } from "@services/StockService";
import { ScheduleItem, StockItem } from "@types";

export const dynamic = "force-dynamic";

const HomePage = async () => {
  const cookieHeader = (await cookies()).toString();
  const init = { headers: { Cookie: cookieHeader } };

  let scheduleItems: ScheduleItem[] = [];
  let stockItems: StockItem[] = [];
  let scheduleError: string | null = null;
  let stockError: string | null = null;

  try {
    scheduleItems = await getScheduleItems(init);
  } catch (error) {
    scheduleError = error instanceof Error ? error.message : "Failed to load schedule.";
  }

  try {
    stockItems = await getStockItems(init);
  } catch (error) {
    stockError = error instanceof Error ? error.message : "Failed to load stock.";
  }

  return (
    <div className="px-6 pb-20 pt-10 lg:px-20">
      <HomeOverview
        scheduleItems={scheduleItems}
        stockItems={stockItems}
        scheduleError={scheduleError}
        stockError={stockError}
      />
    </div>
  );
};

export default HomePage;
