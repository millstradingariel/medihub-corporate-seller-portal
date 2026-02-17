import { useEffect, useState, useMemo } from "react";
import { DollarSign, Users, ShoppingBag, Percent, Loader2 } from "lucide-react";
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

const API_URL = import.meta.env.VITE_API_URL;

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
        console.log('📊 Fetching analytics for kioskId:', kioskId);
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('firebaseToken');
        const url = `${API_URL}/api/kiosk-analytics?kioskId=${kioskId}`;
        console.log('🔗 Fetching from:', url);

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Response status:', res.status);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log('📦 Analytics data:', json);

        setOrders(json.orders || []);
        setProductsByQuantity(json.productsByQuantity || []);
        setProductsByRevenue(json.productsByRevenue || []);
        setReferralFees(Number(json.referralFees || 0));
      } catch (err) {
        console.error('❌ Failed to load analytics:', err);
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">Kiosk Sales</h2>
        <p className="text-zinc-400">{locationName} — Kiosk ID: {kioskId}</p>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Revenue" value={formatCurrency(revenue)} icon={DollarSign} />
        <Stat
          title="Referral Fees (5%)"
          value={formatCurrency(referralFees)}
          icon={Percent}
        />
        <Stat title="Units Sold" value={unitsSold} icon={ShoppingBag} />
        <Stat title="Customers" value={customers} icon={Users} />
      </div>

      {/* ===== REVENUE TREND ===== */}
      {orders.length > 0 && (
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
                dot={{ fill: "#ffffff", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ===== PRODUCTS ===== */}
      {(productsByQuantity.length > 0 || productsByRevenue.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {productsByQuantity.length > 0 && (
            <ProductTable
              title="Top Products (By Quantity)"
              rows={productsByQuantity}
              valueLabel="Units"
            />
          )}

          {productsByRevenue.length > 0 && (
            <ProductTable
              title="Top Products (By Revenue)"
              rows={productsByRevenue}
              valueLabel="$"
              formatValue={formatCurrency}
            />
          )}
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag size={48} className="mx-auto text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg">No sales data available for this kiosk yet.</p>
        </div>
      )}
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
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{title}</p>
          <p className="text-white text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="p-2 bg-zinc-800 rounded-lg">
          <Icon className="text-zinc-400" size={20} />
        </div>
      </div>
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
      <h3 className="text-lg text-white font-semibold mb-4">{title}</h3>
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left py-3 px-2">Product</th>
              <th className="text-right py-3 px-2">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => (
              <tr key={idx} className="border-b border-zinc-800">
                <td className="py-3 px-2">{p.title}</td>
                <td className="py-3 px-2 text-right font-semibold">
                  {formatValue
                    ? formatValue(p.revenue)
                    : p.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}