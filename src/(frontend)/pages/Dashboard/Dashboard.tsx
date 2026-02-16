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
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [lifetimeReferralFees, setLifetimeReferralFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.companyId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('supabaseToken');

        let url = `${API_URL}/api/dashboard/seller?companyId=${currentUser.companyId}`;
        if (filterType === 'year') {
          url += `&year=${selectedYear}`;
        } else if (filterType === 'month') {
          url += `&year=${selectedYear}&month=${selectedMonth}`;
        }

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

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

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const filterLabel = useMemo(() => {
    if (filterType === 'month') {
      return `${monthOptions.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    } else if (filterType === 'year') {
      return `Year ${selectedYear}`;
    }
    return 'All Time';
  }, [filterType, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-red-400 text-center max-w-md">
          <p className="text-lg sm:text-xl font-semibold">Error</p>
          <p className="text-xs sm:text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Dashboard</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-1">
              {currentUser?.companyName || currentUser?.email} — {filterLabel}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar size={18} className="text-zinc-400 flex-shrink-0" />
              <span className="text-zinc-400 text-xs sm:text-sm font-medium">Filter by:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setFilterType('year')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'year' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                By Year
              </button>
              <button
                onClick={() => setFilterType('month')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'month' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                By Month
              </button>
            </div>

            {(filterType === 'year' || filterType === 'month') && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {filterType === 'month' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(stats.lifetimeRevenue)} icon={DollarSign} />
          <StatCard title="Consultation Fees (22.5%)" value={formatCurrency(stats.lifetimeReferralFees)} icon={Calendar} />
          <StatCard title="Total Quantities Sold" value={stats.lifetimeQuantity.toLocaleString()} icon={ShoppingBag} />
          <StatCard title="Average Order Value" value={formatCurrency(stats.lifetimeAOV)} subtitle={`${stats.totalOrders} orders`} icon={TrendingUp} />
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
}

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-zinc-900 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-zinc-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-400 text-xs sm:text-sm truncate">{title}</p>
          <p className="text-white text-xl sm:text-2xl font-bold mt-1 sm:mt-2 break-all">{value}</p>
          {subtitle && <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-800 rounded-lg flex-shrink-0">
          <Icon className="text-zinc-400" size={18} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;