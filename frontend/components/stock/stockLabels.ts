import { Tone } from "@components/ui/Badge";
import { MovementType, PurchaseOrderStatus, StockCategory, StockUnit } from "@types";

export const CATEGORIES: StockCategory[] = [
  "PRODUCE", "MEAT", "FISH", "DAIRY", "DRY_GOODS", "FROZEN", "BEVERAGES", "SAUCES", "PACKAGING", "CLEANING", "OTHER",
];

export const UNITS: StockUnit[] = ["KG", "G", "L", "ML", "PIECE", "BOX", "BOTTLE", "CAN", "PACK"];

export const MOVEMENT_TONES: Record<MovementType, Tone> = {
  INITIAL: "neutral",
  DELIVERY: "green",
  USAGE: "sky",
  WASTE: "red",
  CORRECTION: "amber",
};

export const ORDER_TONES: Record<PurchaseOrderStatus, Tone> = {
  DRAFT: "neutral",
  ORDERED: "indigo",
  RECEIVED: "green",
  CANCELLED: "red",
};
