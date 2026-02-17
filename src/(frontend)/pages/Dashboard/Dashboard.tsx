import React, { useMemo, useState } from "react";
import { Order } from "../../../../types";
import { DollarSign, ShoppingBag, Calendar, TrendingUp } from "lucide-react";
import { Partner } from "../../../../types";

interface DashboardProps {
  orders: Order[];
  lifetimeRevenue: number;
  lifetimeReferralFees: number;
  currentUser: Partner;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);

const Dashboard: React.FC<DashboardProps> = ({
  orders,
  lifetimeRevenue,
  lifetimeReferralFees,
  currentUser,
}) => {
  const stats = useMemo(() => {
    let lifetimeQuantity = 0;

    orders.forEach((order) => {
      order.items?.forEach((item) => {
        lifetimeQuantity += item.quantity;
      });
    });

    const totalOrders = orders.length;
    const lifetimeAOV = totalOrders > 0 ? lifetimeRevenue / totalOrders : 0;

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
          <p className="text-zinc-400">Overview of your performance.</p>
          <p className="text-sm text-zinc-500">{currentUser?.email}</p>
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

/* ================= STAT CARD ================= */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{title}</p>
          <p className="text-white text-2xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-zinc-800 rounded-lg">
          <Icon className="text-zinc-400" size={20} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;