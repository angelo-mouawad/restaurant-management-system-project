export type Role = "admin" | "employee" | "guest";

export type User = {
  id: number;
  name: string;
  username: string;
  role: Role;
};

export type AuthenticatedUser = {
  name: string;
  username: string;
  role: Role;
};

export type AuthContextType = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (userData: AuthenticatedUser) => void;
  logout: () => Promise<void>;
};

export type StockItem = {
  id: number;
  name: string;
  quantity: number;
};

export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Shift = "Morning" | "Evening";

export type ScheduleItem = {
  id: number;
  day: Day;
  shift: Shift;
  name?: string;
  userId?: number;
  user?: User | null;
};

export type Notification = {
  id: number;
  message: string;
  createdAt: string;
  stockItemId?: number | null;
  userId?: number | null;
};
