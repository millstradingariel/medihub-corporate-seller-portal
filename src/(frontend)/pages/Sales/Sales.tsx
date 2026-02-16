import React, { useMemo, useState } from "react";
import StatCard from "../../../(frontend)/components/StatCard";
import { formatCurrency } from "../../../backend/services/dataService";
import {
  DollarSign,
  Calendar,
  Users,
  ShoppingBag,
} from "lucide-react";

type Period = "daily" | "weekly" | "monthly" | "annually";

interface ProductStat {
  title: string;
  quantity: number;
  revenue: number;
}

interface SalesProps {
  orders: any[];
}

const Sales: React.FC<SalesProps> = ({ orders }) => {
  const [period, setPeriod] = useState<Period>("monthly");

  /**
   * =====================
   * Aggregated Stats
   * =====================
   */
  const revenue = useMemo(
    () => orders.reduce((sum, o) => sum + (o.revenue ?? 0), 0),
    [orders]
  );

  const referralFees = useMemo(
    () => orders.reduce((sum, o) => sum + (o.referralFee ?? 0), 0),
    [orders]
  );

  const customers = useMemo(() => {
    const unique = new Set(
      orders.map((o) => o.customerId ?? o.customer_id)
    );
    return unique.size;
  }, [orders]);

  const unitsSold = useMemo(
    () => orders.reduce((sum, o) => sum + (o.quantity ?? 0), 0),
    [orders]
  );

  /**
   * =====================
   * Products aggregation
   * =====================
   */
  const products = useMemo<ProductStat[]>(() => {
    const map = new Map<string, ProductStat>();

    orders.forEach((o) => {
      const title = o.productTitle ?? o.product_title ?? "Unknown Product";
      const quantity = o.quantity ?? 0;
      const revenue = o.revenue ?? 0;

      if (!map.has(title)) {
        map.set(title, { title, quantity: 0, revenue: 0 });
      }

      const item = map.get(title)!;
      item.quantity += quantity;
      item.revenue += revenue;
    });

    return Array.from(map.values());
  }, [orders]);

  const productsByQuantity = useMemo(
    () => [...products].sort((a, b) => b.quantity - a.quantity),
    [products]
  );

  const productsByRevenue = useMemo(
    () => [...products].sort((a, b) => b.revenue - a.revenue),
    [products]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Sales Analytics</h2>
        <p className="text-zinc-400">
          Revenue & performance breakdown.
        </p>
      </div>

      {/* Period Selector */}
      <div className="bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-fit">
        {(["daily", "weekly", "monthly", "annually"] as Period[]).map(
          (p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-md ${period === p
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white"
                }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(revenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Referral Fees"
          value={formatCurrency(referralFees)}
          icon={Calendar}
        />
        <StatCard
          title="Customers"
          value={customers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Units Sold"
          value={unitsSold.toLocaleString()}
          icon={ShoppingBag}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Quantity */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">
            Products Sold by Quantity
          </h3>

          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Units</th>
              </tr>
            </thead>
            <tbody>
              {productsByQuantity.length ? (
                productsByQuantity.map((p) => (
                  <tr
                    key={p.title}
                    className="border-b border-zinc-800 last:border-none"
                  >
                    <td className="py-2 text-white">{p.title}</td>
                    <td className="py-2 text-right text-white">
                      {p.quantity}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="py-4 text-center text-zinc-500"
                  >
                    No product data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Products by Revenue */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">
            Products Sold by Revenue
          </h3>

          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productsByRevenue.length ? (
                productsByRevenue.map((p) => (
                  <tr
                    key={p.title}
                    className="border-b border-zinc-800 last:border-none"
                  >
                    <td className="py-2 text-white">{p.title}</td>
                    <td className="py-2 text-right text-white">
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="py-4 text-center text-zinc-500"
                  >
                    No product data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graph placeholder */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <h3 className="text-lg font-semibold text-white mb-2">
          Sales Trend ({period})
        </h3>
        <p className="text-zinc-400 text-sm">
          GraphQL / chart integration goes here.
        </p>
      </div>
    </div>
  );
};

export default Sales;
