import React, { useMemo, useState } from "react";
import { Order } from "../../../../types";
import { formatCurrency } from "../../../backend/services/dataService";
import StatCard from "../../../(frontend)/components/StatCard";
import {
  DollarSign,
  ShoppingBag,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../auth/useAuth";

interface DashboardProps {
  orders: Order[];
  lifetimeRevenue: number;
  lifetimeReferralFees: number;
}

type ChartPeriod = "weekly" | "monthly" | "all-time";

const Dashboard: React.FC<DashboardProps> = ({
  orders,
  lifetimeRevenue,
  lifetimeReferralFees,
}) => {
  const { user, logout } = useAuth();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("monthly");

  const stats = useMemo(() => {
    let lifetimeQuantity = 0;

    orders.forEach((order) => {
      order.items?.forEach((item) => {
        lifetimeQuantity += item.quantity;
      });
    });

    const totalOrders = orders.length;
    const lifetimeAOV =
      totalOrders > 0 ? lifetimeRevenue / totalOrders : 0;

    return {
      lifetimeRevenue,
      lifetimeReferralFees,
      lifetimeQuantity,
      lifetimeAOV,
    };
  }, [orders, lifetimeRevenue, lifetimeReferralFees]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-zinc-400">
            Overview of your performance.
          </p>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lifetime Revenue"
          value={formatCurrency(stats.lifetimeRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Lifetime Referral Fees"
          value={formatCurrency(stats.lifetimeReferralFees)}
          icon={Calendar}
        />
        <StatCard
          title="Lifetime Quantities Sold"
          value={stats.lifetimeQuantity.toLocaleString()}
          icon={ShoppingBag}
        />
        <StatCard
          title="Lifetime AOV"
          value={formatCurrency(stats.lifetimeAOV)}
          subtitle="Average Order Value"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
};

export default Dashboard;
