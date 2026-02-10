import { useEffect, useMemo, useState } from "react";
import { DollarSign, Calendar, Users, ShoppingBag } from "lucide-react";
import { Period, SalesAnalytics } from "../../types/analytics";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { Order, Location } from "../../../../types";

interface SalesProps {
  orders: Order[];
  locations: Location[];
}
/* ---------------- utils ---------------- */

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

// ISO week number
const getISOWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#00c49f",
];


/* ---------------- component ---------------- */

export default function Sales({ orders, locations }) {
  const now = new Date();

  const [period, setPeriod] = useState<Period>("daily");
  const [data, setData] = useState<SalesAnalytics | null>(null);

  // filters
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [week, setWeek] = useState(getISOWeek(now));

  // earliest year from DB
  const [minYear, setMinYear] = useState<number | null>(null);

  /* ---------------- fetch min year ---------------- */

  useEffect(() => {
    fetch("http://localhost:3001/api/filters")
      .then(res => res.json())
      .then(res => {
        setMinYear(res.minYear);
        setYear(new Date().getFullYear()); // keep default = current year
      })
      .catch(console.error);
  }, []);

  /* ---------------- fetch analytics ---------------- */

  useEffect(() => {
    if (!minYear) return;

    const params = new URLSearchParams({
      period,
      year: year.toString(),
      month: month.toString(),
      day: day.toString(),
      week: week.toString(),
    });

    fetch(`http://localhost:3001/api/analytics?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [period, year, month, day, week, minYear]);

  /* ---------------- dropdown values ---------------- */

  const years = useMemo(() => {
    if (!minYear) return [];
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: currentYear - minYear + 1 },
      (_, i) => minYear + i
    );
  }, [minYear]);

  const months = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const maxMonth = year === currentYear ? currentMonth : 12;
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  }, [year]);

  const days = useMemo(() => {
    const today = new Date();
    const isCurrentMonth =
      year === today.getFullYear() &&
      month === today.getMonth() + 1;

    const maxDay = isCurrentMonth
      ? today.getDate()
      : daysInMonth(year, month);

    return Array.from({ length: maxDay }, (_, i) => i + 1);
  }, [year, month]);

  const weeks = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentWeek = getISOWeek(today);

    const maxWeek = year === currentYear ? currentWeek : 52;
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  }, [year]);

  /* ---------------- derived ---------------- */

  const products = data?.products ?? [];

  const productsByQty = useMemo(
    () => [...products].sort((a, b) => b.quantity - a.quantity),
    [products]
  );

  const productsByRevenue = useMemo(
    () => [...products].sort((a, b) => b.revenue - a.revenue),
    [products]
  );

  if (!data) {
    return <p className="text-white p-6">Loading analytics…</p>;
  }

  /* ---------------- render ---------------- */

  return (
    <div className="p-8 space-y-6 bg-black min-h-screen">
      <h2 className="text-2xl font-bold text-white">Analytics</h2>

      {/* period selector */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly", "annually"] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm rounded ${period === p
              ? "bg-white text-black"
              : "bg-zinc-800 text-white"
              }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="flex gap-2">
        {/* year */}
        <select
          value={year}
          onChange={e => setYear(+e.target.value)}
          className="bg-zinc-800 text-white px-2 py-1 rounded"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* month */}
        {(period === "daily" || period === "monthly") && (
          <select
            value={month}
            onChange={e => setMonth(+e.target.value)}
            className="bg-zinc-800 text-white px-2 py-1 rounded"
          >
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}

        {/* week */}
        {period === "weekly" && (
          <select
            value={week}
            onChange={e => setWeek(+e.target.value)}
            className="bg-zinc-800 text-white px-2 py-1 rounded"
          >
            {weeks.map(w => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        )}

        {/* day */}
        {period === "daily" && (
          <select
            value={day}
            onChange={e => setDay(+e.target.value)}
            className="bg-zinc-800 text-white px-2 py-1 rounded"
          >
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} />
        <Stat title="Referral Fees" value={formatCurrency(data.referralFees)} icon={Calendar} />
        <Stat title="Customers" value={data.customers} icon={Users} />
        <Stat title="Units Sold" value={data.unitsSold} icon={ShoppingBag} />
      </div>

      {/* tables */}
      <Table title="Products Sold by Quantity" rows={productsByQty} type="quantity" />
      <Table title="Products Sold by Revenue" rows={productsByRevenue} type="revenue" />

      {/* ==============================
    REVENUE & UNITS SOLD (LINE)
================================ */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <h3 className="text-lg text-white mb-4">Revenue & Units Sold</h3>

        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                {
                  name: "Sales",
                  revenue: data.revenue,
                  units: data.unitsSold,
                },
              ]}
            >
              <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#ffffff"
                strokeWidth={2}
                dot={{ fill: "#d4d4d8" }}
              />
              <Line
                type="monotone"
                dataKey="units"
                stroke="#a1a1aa"
                strokeWidth={2}
                dot={{ fill: "#e5e7eb" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==============================
    TOP PRODUCTS BY REVENUE (LINE)
================================ */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <h3 className="text-lg text-white mb-4">Top Products by Revenue</h3>

        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productsByRevenue.slice(0, 5)}>
              <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
              <XAxis dataKey="title" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#ffffff"
                strokeWidth={2}
                dot={{ fill: "#d4d4d8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==============================
    REVENUE SHARE TREND (LINE)
================================ */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <h3 className="text-lg text-white mb-4">Revenue Share Trend</h3>

        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productsByRevenue.slice(0, 5)}>
              <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
              <XAxis dataKey="title" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#e5e7eb"
                strokeWidth={2}
                dot={{ fill: "#fafafa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );
}

/* ---------------- small components ---------------- */

function Stat({ title, value, icon: Icon }: any) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <p className="text-zinc-400 text-sm">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <Icon className="text-zinc-600 mt-2" />
    </div>
  );
}

function Table({ title, rows, type }: any) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <h3 className="text-lg text-white mb-4">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.title} className="border-b border-zinc-800">
              <td className="py-2 text-white">{r.title}</td>
              <td className="py-2 text-right text-white">
                {type === "revenue"
                  ? formatCurrency(r.revenue)
                  : r.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
