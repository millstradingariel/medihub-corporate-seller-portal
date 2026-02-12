import React, { useEffect, useState } from "react";
import { ArrowLeft, DollarSign, Users as UsersIcon, Package, TrendingUp, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface AccountData {
    totalRevenue: number;
    referralFees: number;
    totalCustomers: number;
    unitsSold: number;
    productsByQuantity: Array<{
        product_name: string;
        quantity: number;
    }>;
    productsByAmount: Array<{
        product_name: string;
        amount: number;
    }>;
    commission: number;
}

interface Props {
    companyId: string;
    companyName: string;
    onBack: () => void;
}

const CompanyAccountDetail: React.FC<Props> = ({ companyId, companyName, onBack }) => {
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
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

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        const fetchAccountData = async () => {
            try {
                setLoading(true);

                // Get token from localStorage
                const token = localStorage.getItem("firebaseToken");
                if (!token) {
                    console.error("No authentication token found");
                    return;
                }

                const res = await fetch(
                    `${API_URL}/api/finance/account/${companyId}?month=${selectedMonth}&year=${selectedYear}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const json = await res.json();
                setAccountData(json.data);
            } catch (err) {
                console.error("Failed to fetch account data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAccountData();
    }, [companyId, selectedMonth, selectedYear]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} className="text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{companyName}</h1>
                        <p className="text-zinc-400 mt-1">Financial Account Overview</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar size={20} />
                        <span className="font-medium">Filter:</span>
                    </div>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {months.map((month) => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Metrics */}
            {/* Summary Metrics */}
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <DollarSign className="text-green-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-white">
                        ${(accountData?.totalRevenue ?? 0).toLocaleString()}
                    </p>
                </div>

                {/* Commission */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-teal-500/20 rounded-lg">
                            <DollarSign className="text-teal-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Referral Fees</p>
                    <p className="text-3xl font-bold text-white">
                        ${(accountData?.commission ?? 0).toLocaleString()}
                    </p>
                </div>

                {/* Total Customers */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <UsersIcon className="text-purple-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Total Customers</p>
                    <p className="text-3xl font-bold text-white">
                        {(accountData?.totalCustomers ?? 0).toLocaleString()}
                    </p>
                </div>

                {/* Units Sold */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-500/20 rounded-lg">
                            <Package className="text-orange-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Units Sold</p>
                    <p className="text-3xl font-bold text-white">
                        {(accountData?.unitsSold ?? 0).toLocaleString()}
                    </p>
                </div>
            </div>


            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products by Quantity */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Package size={20} className="text-blue-500" />
                            Products Sold by Quantity
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800">
                                    <th className="text-left p-4 text-sm font-semibold text-zinc-400">Product</th>
                                    <th className="text-right p-4 text-sm font-semibold text-zinc-400">Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {accountData?.productsByQuantity && accountData.productsByQuantity.length > 0 ? (
                                    accountData.productsByQuantity.map((product, index) => (
                                        <tr key={index} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-4 text-white">{product.product_name}</td>
                                            <td className="p-4 text-right text-white font-mono">
                                                {product.quantity.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-zinc-500">
                                            No products sold
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Products by Amount */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <DollarSign size={20} className="text-green-500" />
                            Products Sold by Amount
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800">
                                    <th className="text-left p-4 text-sm font-semibold text-zinc-400">Product</th>
                                    <th className="text-right p-4 text-sm font-semibold text-zinc-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {accountData?.productsByAmount && accountData.productsByAmount.length > 0 ? (
                                    accountData.productsByAmount.map((product, index) => (
                                        <tr key={index} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-4 text-white">{product.product_name}</td>
                                            <td className="p-4 text-right text-white font-mono">
                                                ${product.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-zinc-500">
                                            No products sold
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyAccountDetail;
