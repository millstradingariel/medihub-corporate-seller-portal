import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, ShoppingBag, Users, TrendingUp, Loader2, Calendar, Building2 } from "lucide-react";
import { Partner } from "../../../../types";

interface CorporateDashboardProps {
  currentUser: Partner;
}

type FilterType = 'all' | 'year' | 'month';

interface CompanyStats {
  company_id: number;
  company_name: string;
  revenue: number;
  orders: number;
  units_sold: number;
}

const API_URL = import.meta.env.VITE_API_URL;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);

const CorporateDashboard: React.FC<CorporateDashboardProps> = ({ currentUser }) => {
  // Filter states
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Data states
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalReferralFees, setTotalReferralFees] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalUnitsSold, setTotalUnitsSold] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchCorporateDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('firebaseToken');

        let url = `${API_URL}/api/corporate-dashboard`;
        const params = new URLSearchParams();
        
        if (filterType === 'year') {
          params.append('year', selectedYear.toString());
        } else if (filterType === 'month') {
          params.append('year', selectedYear.toString());
          params.append('month', selectedMonth.toString());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        setTotalRevenue(json.totalRevenue || 0);
        setTotalReferralFees(json.totalReferralFees || 0);
        setTotalOrders(json.totalOrders || 0);
        setTotalUnitsSold(json.totalUnitsSold || 0);
        setTotalCustomers(json.totalCustomers || 0);
        setCompanyStats(json.companyStats || []);
      } catch (err) {
        console.error('❌ Corporate dashboard fetch error:', err);
        setError('Failed to load corporate dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchCorporateDashboard();
  }, [filterType, selectedYear, selectedMonth]);

  /* ================= METRICS ================= */

  const avgOrderValue = useMemo(() => {
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  }, [totalRevenue, totalOrders]);

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

  /* ================= LOADING ================= */

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

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <Building2 className="flex-shrink-0 text-blue-500" size={24} />
              <span className="truncate">Corporate Dashboard</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-1">
              All Companies — {filterLabel}
            </p>
          </div>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar size={18} className="text-zinc-400 flex-shrink-0" />
              <span className="text-zinc-400 text-xs sm:text-sm font-medium">Filter by:</span>
            </div>

            {/* Filter Type Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setFilterType('year')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'year'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                By Year
              </button>
              <button
                onClick={() => setFilterType('month')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                By Month
              </button>
            </div>

            {/* Year & Month Selectors */}
            {(filterType === 'year' || filterType === 'month') && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {filterType === 'month' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* ===== STAT CARDS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Referral Fees (5%)"
            value={formatCurrency(totalReferralFees)}
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="Total Units Sold"
            value={totalUnitsSold.toLocaleString()}
            icon={ShoppingBag}
            color="purple"
          />
          <StatCard
            title="Total Customers"
            value={totalCustomers.toLocaleString()}
            subtitle={`${totalOrders} orders`}
            icon={Users}
            color="orange"
          />
        </div>

        {/* ===== ADDITIONAL METRICS ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            label="Total Orders"
            value={totalOrders.toLocaleString()}
          />
          <MetricCard
            label="Average Order Value"
            value={formatCurrency(avgOrderValue)}
          />
          <MetricCard
            label="Active Companies"
            value={companyStats.length.toLocaleString()}
          />
        </div>

        {/* ===== COMPANY BREAKDOWN - Desktop Table ===== */}
        {companyStats.length > 0 && (
          <>
            <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-blue-500 flex-shrink-0" />
                <span className="truncate">Company Breakdown</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="flex-shrink-0" />
                          <span className="truncate">Company</span>
                        </div>
                      </th>
                      <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400">Revenue</th>
                      <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400">Orders</th>
                      <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400">Units</th>
                      <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {companyStats.map((company) => (
                      <tr key={company.company_id} className="hover:bg-zinc-800/50 transition-colors">
                        <td className="p-3 lg:p-4">
                          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {company.company_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white font-medium text-sm lg:text-base truncate">{company.company_name}</span>
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 text-right text-white font-semibold text-sm lg:text-base">
                          {formatCurrency(company.revenue)}
                        </td>
                        <td className="p-3 lg:p-4 text-right text-zinc-300 text-sm lg:text-base">
                          {company.orders.toLocaleString()}
                        </td>
                        <td className="p-3 lg:p-4 text-right text-zinc-300 text-sm lg:text-base">
                          {company.units_sold.toLocaleString()}
                        </td>
                        <td className="p-3 lg:p-4 text-right text-zinc-400 text-sm lg:text-base">
                          {formatCurrency(company.orders > 0 ? company.revenue / company.orders : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== COMPANY BREAKDOWN - Mobile Cards ===== */}
            <div className="md:hidden space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 px-1">
                <Building2 size={18} className="text-blue-500" />
                Company Breakdown
              </h3>
              {companyStats.map((company) => (
                <div key={company.company_id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                      {company.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-medium text-base truncate">{company.company_name}</h4>
                      <p className="text-zinc-500 text-xs">{company.orders} orders</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Revenue</p>
                      <p className="text-base font-semibold text-white break-all">{formatCurrency(company.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Units Sold</p>
                      <p className="text-base font-semibold text-white">{company.units_sold.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-zinc-400 mb-1">Avg Order Value</p>
                      <p className="text-base font-semibold text-white break-all">
                        {formatCurrency(company.orders > 0 ? company.revenue / company.orders : 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ================= SUB COMPONENTS ================= */

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-zinc-900 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-zinc-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-400 text-xs sm:text-sm truncate">{title}</p>
          <p className="text-white text-xl sm:text-2xl font-bold mt-1 sm:mt-2 break-all">{value}</p>
          {subtitle && (
            <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-3 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex-shrink-0`}>
          <Icon className="text-white" size={18} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
      <p className="text-zinc-400 text-xs sm:text-sm truncate">{label}</p>
      <p className="text-white text-lg sm:text-xl font-bold mt-1 break-all">{value}</p>
    </div>
  );
}

export default CorporateDashboard;