import { Bike, CarFront, CarTaxiFront, Package, Truck, type LucideIcon } from "lucide-react";
import type { VehicleCategory } from "@rydex/shared/types";

export const CATEGORY_ICONS: Record<VehicleCategory, LucideIcon> = {
  bike: Bike,
  car: CarFront,
  auto: CarTaxiFront,
  loading: Package,
  truck: Truck,
};
