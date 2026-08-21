import { cookies } from "next/headers";
import ScheduleOverview from "@components/schedule/ScheduleOverview";
import { getScheduleItems } from "@services/ScheduleService";
import { getAllUsers } from "@services/UserService";
import { ScheduleItem, User } from "@types";

export const dynamic = "force-dynamic";

const SchedulePage = async () => {
  const cookieHeader = (await cookies()).toString();
  const init = { headers: { Cookie: cookieHeader } };

  let items: ScheduleItem[] = [];
  let users: User[] = [];
  let loadError: string | null = null;

  try {
    items = await getScheduleItems(init);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load schedule.";
  }

  try {
    users = await getAllUsers(init);
  } catch {
    users = [];
  }

  return (
    <div className="px-6 pb-20 pt-10 lg:px-20">
      <ScheduleOverview items={items} users={users} loadError={loadError} />
    </div>
  );
};

export default SchedulePage;
