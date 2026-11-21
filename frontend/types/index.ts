// Shapes returned by the API. Dates are ISO strings (yyyy-mm-dd), times are HH:mm or HH:mm:ss.

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type User = {
  id: number;
  name: string;
  role: Role;
  position: string | null;
  active: boolean;
  joinedAt: string;
  managerId: number | null;
  managerName: string | null;
  /** The fields below are null unless the viewer is management or the user themselves. */
  username: string | null;
  email: string | null;
  phone: string | null;
  maxWeeklyHours: number | null;
  contactVisible: boolean;
  canManage: boolean;
};

export type Profile = {
  user: User;
  upcomingShifts: Shift[] | null;
  hoursThisWeek: number | null;
  team: User[];
  self: boolean;
};

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// ---------------------------------------------------------------- scheduling

export type ShiftColor = "teal" | "amber" | "indigo" | "rose" | "sky" | "slate";

export type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  color: ShiftColor;
  active: boolean;
  hours: number;
  /** Weekdays the shift runs on, as Java names (MONDAY ... SUNDAY). */
  days: string[];
};

export type AvailabilityStatus = "AVAILABLE" | "PREFERRED" | "UNAVAILABLE";

export type Availability = {
  userId: number;
  date: string;
  status: AvailabilityStatus;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

export type AvailabilityEntry = {
  date: string;
  status: AvailabilityStatus | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
};

export type MyAvailability = {
  from: string;
  to: string;
  entries: Availability[];
  lockedWeeks: string[];
};

export type BulkResult = { saved: number; cleared: number; skippedLockedWeeks: string[] };

export type PeriodStatus = "DRAFT" | "PUBLISHED";

export type Shift = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  userId: number;
  userName: string;
  shiftTypeId: number | null;
  shiftTypeName: string;
  color: ShiftColor;
  note: string | null;
  periodStatus: PeriodStatus;
};

export type Period = {
  weekStart: string;
  weekEnd: string;
  status: PeriodStatus;
  availabilityLocked: boolean;
  publishedAt: string | null;
  publishedByName: string | null;
  shiftCount: number;
  changeCount: number;
};

export type PlanningWarning = {
  type: "UNAVAILABLE" | "OUTSIDE_AVAILABILITY" | "DOUBLE_BOOKED" | "OVER_HOURS" | "UNDERSTAFFED";
  severity: "ERROR" | "WARNING";
  date: string;
  userId: number | null;
  shiftId: number | null;
  shiftTypeId: number | null;
  message: string;
};

export type PlanningEmployee = {
  id: number;
  name: string;
  position: string | null;
  maxWeeklyHours: number;
  hoursByWeek: Record<string, number>;
};

export type Planning = {
  from: string;
  to: string;
  employees: PlanningEmployee[];
  shiftTypes: ShiftType[];
  shifts: Shift[];
  availability: Availability[];
  periods: Period[];
  warnings: PlanningWarning[];
};

export type ShiftInput = {
  userId: number;
  date: string;
  shiftTypeId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
  force?: boolean;
};

export type WeekSummary = { weekStart: string; hours: number; shiftCount: number; published: boolean };

export type MySchedule = { from: string; to: string; shifts: Shift[]; weeks: WeekSummary[] };

export type ShiftChange = {
  id: number;
  changeType: "ASSIGNED" | "MODIFIED" | "REMOVED";
  description: string;
  affectedUserName: string | null;
  changedByName: string | null;
  changedAt: string;
};

// ---------------------------------------------------------------- stock

export type StockCategory =
  | "PRODUCE" | "MEAT" | "FISH" | "DAIRY" | "DRY_GOODS" | "FROZEN"
  | "BEVERAGES" | "SAUCES" | "PACKAGING" | "CLEANING" | "OTHER";

export type StockUnit = "KG" | "G" | "L" | "ML" | "PIECE" | "BOX" | "BOTTLE" | "CAN" | "PACK";

export type MovementType = "INITIAL" | "DELIVERY" | "USAGE" | "WASTE" | "CORRECTION";

export type StockItem = {
  id: number;
  name: string;
  category: StockCategory;
  unit: StockUnit;
  quantity: number;
  minThreshold: number;
  costPerUnit: number;
  stockValue: number;
  low: boolean;
  archived: boolean;
  supplierId: number | null;
  supplierName: string | null;
};

export type StockItemInput = {
  name: string;
  category: StockCategory;
  unit: StockUnit;
  minThreshold: number;
  costPerUnit: number;
  supplierId: number | null;
  initialQuantity?: number | null;
};

export type Movement = {
  id: number;
  itemId: number;
  itemName: string;
  unit: StockUnit;
  type: MovementType;
  quantityChange: number;
  quantityAfter: number;
  reason: string | null;
  userName: string | null;
  purchaseOrderId: number | null;
  createdAt: string;
};

export type StockItemDetail = { item: StockItem; recentMovements: Movement[] };

export type StockOverview = {
  totalValue: number;
  itemCount: number;
  lowStockCount: number;
  openOrderCount: number;
  lowStockItems: StockItem[];
  recentMovements: Movement[];
};

export type Supplier = {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  leadTimeDays: number;
  itemCount: number;
};

export type SupplierInput = Omit<Supplier, "id" | "itemCount">;

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";

export type PurchaseOrderLine = {
  id: number;
  itemId: number;
  itemName: string;
  unit: StockUnit;
  quantity: number;
  unitCost: number;
  total: number;
};

export type PurchaseOrder = {
  id: number;
  supplierId: number;
  supplierName: string;
  status: PurchaseOrderStatus;
  note: string | null;
  expectedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
  receivedByName: string | null;
  lineCount: number;
  total: number;
  lines: PurchaseOrderLine[];
};

export type PurchaseOrderInput = {
  supplierId: number;
  expectedAt: string | null;
  note: string | null;
  lines: { itemId: number; quantity: number; unitCost?: number | null }[];
};

// ---------------------------------------------------------------- notifications

export type NotificationType =
  | "GENERAL"
  | "ACCOUNT_CREATED"
  | "ROLE_CHANGED"
  | "AVAILABILITY_SUBMITTED"
  | "SCHEDULE_PUBLISHED"
  | "SHIFT_CHANGED"
  | "LOW_STOCK"
  | "PURCHASE_ORDER_RECEIVED";

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  params: Record<string, string | number>;
  link: string | null;
  createdAt: string;
  read: boolean;
};
