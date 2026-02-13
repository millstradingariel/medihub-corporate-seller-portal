export type Period = "daily" | "weekly" | "monthly" | "annually";

export interface ProductStat {
  title: string;
  quantity: number;
  revenue: number;
}

export interface SalesAnalytics {
  revenue: number;
  referralFees: number;
  customers: number;
  unitsSold: number;
  products: ProductStat[];
}
