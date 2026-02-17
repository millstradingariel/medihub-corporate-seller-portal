import React, { useEffect, useMemo, useState } from "react";
import { Order } from "../../../../types";
import { DollarSign, ShoppingBag, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { Partner } from "../../../../types";

interface DashboardProps {
  currentUser: Partner;
}

type FilterType = 'all' | 'year' | 'month';

const API_URL = import.meta.env.VITE_API_URL;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // Filter states
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [lifetimeReferralFees, setLifetimeReferralFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!currentUser?.companyId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('firebaseToken');

        // Build URL with filters
        let url = `${API_URL}/api/dashboard?companyId=${currentUser.companyId}`;
        if (filterType === 'year') {
          url += `&year=${selectedYear}`;
        } else if (filterType === 'month') {
          url += `&year=${selectedYear}&month=${selectedMonth}`;
        }

        console.log('📊 Fetching dashboard:', url);

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        console.log('📦 Dashboard data:', json);

        setOrders(json.orders || []);
        setLifetimeRevenue(json.lifetimeRevenue || 0);
        setLifetimeReferralFees(json.lifetimeReferralFees || 0);
      } catch (err) {
        console.error('❌ Dashboard fetch error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [currentUser, filterType, selectedYear, selectedMonth]);

  /* ================= METRICS ================= */

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
      totalOrders,
    };
  }, [orders, lifetimeRevenue, lifetimeReferralFees]);

  // Year options (last 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  /* ================= FILTER LABEL ================= */

  const filterLabel = useMemo(() => {
    if (filterType === 'month') {
      return `${monthOptions.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    } else if (filterType === 'year') {
      return `Year ${selectedYear}`;
    }
    return 'All Time';
  }, [filterType, selectedYear, selectedMonth]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-zinc-400">
            {currentUser?.companyName || currentUser?.email} — {filterLabel}
          </p>
        </div>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-zinc-400" />
            <span className="text-zinc-400 text-sm font-medium">Filter by:</span>
          </div>

          {/* Filter Type Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterType('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              By Month
            </button>
          </div>

          {/* Year Selector */}
          {(filterType === 'year' || filterType === 'month') && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          {/* Month Selector */}
          {filterType === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.lifetimeRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Referral Fees (5%)"
          value={formatCurrency(stats.lifetimeReferralFees)}
          icon={Calendar}
        />
        <StatCard
          title="Total Quantities Sold"
          value={stats.lifetimeQuantity.toLocaleString()}
          icon={ShoppingBag}
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(stats.lifetimeAOV)}
          subtitle={`${stats.totalOrders} orders`}
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