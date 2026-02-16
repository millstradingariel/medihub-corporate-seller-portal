import React, { useEffect, useState } from "react";
import { Partner } from '../../../../types';

import {
    ShoppingBag,
    Search,
    Loader2,
    X,
    Package,
    Eye,
    Calendar,
    Hash,
    CreditCard,
    Truck,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

interface WholesaleOrder {
    wholesale_orders_id: string;
    wholesale_orders_date: string;
    wholesale_orders_name: string;
    company_id: string;
    payment_status: string;
    payment_date: string;
    fulfillment_status?: string;
    items: OrderItem[];
}

interface OrderItem {
    wholesale_order_id: string;
    title: string;
    sku: string;
    qty: number;
    price: number | string;
}

interface ViewOrdersProps {
    currentUser?: Partner;
}

const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.startsWith("0000")) return "—";
    return new Date(dateStr).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
};

const PaymentBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        Paid: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        Pending: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        Refunded: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        Voided: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status] || styles.Pending}`}>
            {status || "Pending"} {/* ✅ use status prop */}
        </span>
    );
};

const FulfillmentBadge = ({ status }: { status?: string }) => {
    const s = status || "Unfulfilled";
    const styles: Record<string, string> = {
        Fulfilled: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        Unfulfilled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
        Partially_Fulfilled: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        In_Progress: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        On_Hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[s] || styles.Unfulfilled}`}
        >
            {s.replace(/_/g, " ")}
        </span>
    );
};

const ViewOrders: React.FC<ViewOrdersProps> = ({ currentUser }) => {
    const [orders, setOrders] = useState<WholesaleOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const itemsPerPage = 10;

    const [filterType, setFilterType] = useState<"all" | "month" | "year">("all");
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "paid_unfulfilled" | "pending" | "fulfilled" | "pending_unfulfilled">("all");

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('supabaseToken');
                const res = await fetch(
                    `${API_URL}/api/wholesale-orders/syncWholesaleOrderByCompanyID${currentUser?.companyId ? `?companyId=${currentUser.companyId}` : ''}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const json = await res.json();

                const allOrders = json.orders || [];
                const companyId = String(currentUser?.companyId || "");

                const filteindigo = allOrders.filter((o: WholesaleOrder) => {
                    const matchesCompany = companyId ? String(o.company_id) === companyId : true;
                    const isNotCompleted = !(o.payment_status === "Paid" && o.fulfillment_status === "Fulfilled");
                    return matchesCompany && isNotCompleted;
                });

                setOrders(filteindigo);
            } catch (err) {
                console.error(err);
                setError("Failed to load wholesale orders");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [currentUser]);

    const handleViewItems = (order: WholesaleOrder) => {
        setSelectedOrder(order);
        setOrderItems(order.items || []);
    };

    const closeModal = () => {
        setSelectedOrder(null);
        setOrderItems([]);
    };

    // Available years from orders
    const availableYears = [...new Set(orders.map(o => new Date(o.wholesale_orders_date).getFullYear()))].sort((a, b) => b - a);

    // Update your filtered variable
    const filtered = orders.filter((o) => {
        const matchesSearch =
            o.wholesale_orders_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.wholesale_orders_id?.toLowerCase().includes(searchQuery.toLowerCase());

        const date = new Date(o.wholesale_orders_date);
        const matchesDate =
            filterType === "all" ? true :
                filterType === "year" ? date.getFullYear() === filterYear :
                    filterType === "month" ? date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth :
                        true;

        const matchesStatus =
            statusFilter === "all" ? true :
                statusFilter === "paid" ? o.payment_status === "Paid" :
                    statusFilter === "paid_unfulfilled" ? o.payment_status === "Paid" && o.fulfillment_status === "Unfulfilled" :
                        statusFilter === "pending" ? o.payment_status === "Pending" :
                            statusFilter === "fulfilled" ? o.fulfillment_status === "Fulfilled" :
                                statusFilter === "pending_unfulfilled" ? o.payment_status === "Pending" && o.fulfillment_status === "Unfulfilled" :
                                    true;

        return matchesSearch && matchesDate && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const current = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => setCurrentPage(1), [searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-red-400 text-center">
                    <p className="text-xl font-semibold">Error</p>
                    <p className="text-sm mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingBag className="text-indigo-500" size={32} />
                        View Wholesale Orders
                    </h1>
                    <p className="text-zinc-400 mt-1">View all pending and unfulfilled orders</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Paid & Unfulfilled */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <CreditCard className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Paid & Unfulfilled</p>
                            <p className="text-2xl font-bold text-white">
                                {orders.filter((o) => o.payment_status === "Paid" && o.fulfillment_status === "Unfulfilled").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending & Fulfilled */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Truck className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Pending & Fulfilled</p>
                            <p className="text-2xl font-bold text-white">
                                {orders.filter((o) => o.payment_status === "Pending" && o.fulfillment_status === "Fulfilled").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending & Unfulfilled */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Package className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Pending & Unfulfilled</p>
                            <p className="text-2xl font-bold text-white">
                                {orders.filter((o) => o.payment_status === "Pending" && o.fulfillment_status === "Unfulfilled").length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <ShoppingBag className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Total Wholesale Orders</p>
                            <p className="text-2xl font-bold text-white">{orders.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by order ID or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">

                {/* Date Filter */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setFilterType("all")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === "all" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setFilterType("year")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === "year" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        By Year
                    </button>
                    <button
                        onClick={() => setFilterType("month")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === "month" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        By Month
                    </button>
                </div>

                {/* Year Selector */}
                {(filterType === "year" || filterType === "month") && (
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableYears.length > 0 ? availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        )) : (
                            <option value={filterYear}>{filterYear}</option>
                        )}
                    </select>
                )}

                {/* Month Selector */}
                {filterType === "month" && (
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(Number(e.target.value))}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {[
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                        ].map((month, i) => (
                            <option key={i + 1} value={i + 1}>{month}</option>
                        ))}
                    </select>
                )}

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Status</option>
                    <option value="paid_unfulfilled">Paid & Unfulfilled</option>
                    <option value="pending_unfulfilled">Pending & Fulfilled</option>
                    <option value="pending_unfulfilled">Pending & Unfulfilled</option>
                </select>

                <span className="text-zinc-500 text-sm">
                    {filterType === "all" && "Showing all orders"}
                    {filterType === "year" && `Showing orders from ${filterYear}`}
                    {filterType === "month" && `Showing orders from ${new Date(filterYear, filterMonth - 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`}
                </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-950 border-b border-zinc-800">
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2"><Hash size={14} /> Order ID</div>
                                </th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2"><Calendar size={14} /> Order Date</div>
                                </th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2"><CreditCard size={14} /> Payment</div>
                                </th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2"><Calendar size={14} /> Payment Date</div>
                                </th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2"><Truck size={14} /> Fulfillment</div>
                                </th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {current.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                                        No wholesale orders found
                                    </td>
                                </tr>
                            ) : (
                                current.map((order) => (
                                    <tr
                                        key={order.wholesale_orders_id}
                                        className="hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <td className="p-4">
                                            <span className="text-white font-medium">
                                                {order.wholesale_orders_name}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-300 text-sm">
                                                {formatDate(order.wholesale_orders_date)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <PaymentBadge status={order.payment_status} />
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-300 text-sm">
                                                {formatDate(order.payment_date)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <FulfillmentBadge status={order.fulfillment_status} />
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleViewItems(order)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <Eye size={14} />
                                                View Items
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
                    <p>
                        Showing <span className="text-white font-medium">{startIndex + 1}</span> to{" "}
                        <span className="text-white font-medium">
                            {Math.min(startIndex + itemsPerPage, filtered.length)}
                        </span>{" "}
                        of <span className="text-white font-medium">{filtered.length}</span> orders
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    const show =
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1);
                                    const ellipsis =
                                        (page === currentPage - 2 && currentPage > 3) ||
                                        (page === currentPage + 2 && currentPage < totalPages - 2);
                                    if (ellipsis) return <span key={page} className="px-2 text-zinc-600">...</span>;
                                    if (!show) return null;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page
                                                ? "bg-indigo-600 text-white"
                                                : "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Items Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-zinc-900 w-full max-w-2xl rounded-2xl border border-zinc-800 z-10 max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-indigo-400" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedOrder.wholesale_orders_name}
                                    </h2>
                                    <p className="text-xs text-zinc-400">
                                        ID: {selectedOrder.wholesale_orders_id}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {itemsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                                </div>
                            ) : orderItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-400">No items found for this order</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orderItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 hover:border-zinc-600 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate">{item.title}</p>
                                                    <p className="text-xs text-zinc-500 mt-1">SKU: {item.sku || "—"}</p>
                                                </div>
                                                <div className="text-right ml-4 flex-shrink-0">
                                                    <p className="text-white font-bold">${Number(item.price).toFixed(2)}</p>
                                                    <p className="text-xs text-zinc-400">Qty: {item.qty}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-zinc-700 flex justify-between text-xs text-zinc-400">
                                                <span>Unit price</span>
                                                <span className="text-white font-medium">
                                                    Total: ${(Number(item.price) * item.qty).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 mt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400 font-medium">Order Total</span>
                                            <span className="text-xl font-bold text-indigo-400">
                                                ${orderItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewOrders;