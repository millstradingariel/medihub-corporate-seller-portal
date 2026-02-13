import { useEffect, useState, useMemo } from "react";
import { DollarSign, Users, ShoppingBag, Percent } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ================= TYPES ================= */

interface KioskSalesProps {
  kioskId: string;
  locationName: string;
}

interface Order {
  shopify_order_id: string;
  order_date: string;
  total_ex_gst: number;
  shopify_customer_id: string | null;
}

interface ProductStat {
  title: string;
  quantity: number;
  revenue: number;
}

const API_URL = process.env.REACT_APP_API_URL;


/* ================= COMPONENT ================= */

export default function KioskSales({
  kioskId,
  locationName,
}: KioskSalesProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsByQuantity, setProductsByQuantity] = useState<ProductStat[]>([]);
  const [productsByRevenue, setProductsByRevenue] = useState<ProductStat[]>([]);
  const [referralFees, setReferralFees] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!kioskId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${API_URL}/api/kiosk-analytics?kioskId=${kioskId}`
        );
        const json = await res.json();

        setOrders(json.orders || []);
        setProductsByQuantity(json.productsByQuantity || []);
        setProductsByRevenue(json.productsByRevenue || []);
        setReferralFees(Number(json.referralFees || 0));
      } catch (err) {
        console.error(err);
        setError("Failed to load kiosk analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [kioskId]);

  /* ================= METRICS ================= */

  const revenue = useMemo(
    () =>
      orders.reduce(
        (sum, o) => sum + Number(o.total_ex_gst || 0),
        0
      ),
    [orders]
  );

  const unitsSold = useMemo(
    () =>
      productsByQuantity.reduce(
        (sum, p) => sum + Number(p.quantity || 0),
        0
      ),
    [productsByQuantity]
  );

  const customers = useMemo(
    () =>
      new Set(
        orders
          .map((o) => o.shopify_customer_id)
          .filter(Boolean)
      ).size,
    [orders]
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);

  /* ================= STATES ================= */

  if (loading)
    return <p className="text-white p-6">Loading kiosk sales…</p>;

  if (error)
    return <p className="text-red-400 p-6">{error}</p>;

  /* ================= RENDER ================= */

  return (
    <div className="p-8 space-y-8 bg-black min-h-screen">
      <h2 className="text-2xl font-bold text-white">
        {locationName} — Kiosk Sales
      </h2>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Revenue" value={formatCurrency(revenue)} icon={DollarSign} />
        <Stat
          title="Referral Fees"
          value={formatCurrency(referralFees)}
          icon={Percent}
        />
        <Stat title="Units Sold" value={unitsSold} icon={ShoppingBag} />
        <Stat title="Customers" value={customers} icon={Users} />
      </div>

      {/* ===== REVENUE TREND ===== */}
      <Card title="Revenue Trend">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={orders.map((o) => ({
              date: new Date(o.order_date).toLocaleDateString(),
              revenue: Number(o.total_ex_gst),
            }))}
          >
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#a1a1aa" />
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
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ===== PRODUCTS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductTable
          title="Top Products (By Quantity)"
          rows={productsByQuantity}
          valueLabel="Units"
        />

        <ProductTable
          title="Top Products (By Revenue)"
          rows={productsByRevenue}
          valueLabel="$"
          formatValue={formatCurrency}
        />
      </div>
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: any;
}) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <p className="text-zinc-400 text-sm">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <Icon className="text-zinc-600 mt-2" />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <h3 className="text-lg text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ProductTable({
  title,
  rows,
  valueLabel,
  formatValue,
}: {
  title: string;
  rows: ProductStat[];
  valueLabel: string;
  formatValue?: (n: number) => string;
}) {
  return (
    <Card title={title}>
      <table className="w-full text-sm text-zinc-300">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-2">Product</th>
            <th className="text-right py-2">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.title} className="border-b border-zinc-800">
              <td className="py-2">{p.title}</td>
              <td className="py-2 text-right">
                {formatValue
                  ? formatValue(p.revenue)
                  : p.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}