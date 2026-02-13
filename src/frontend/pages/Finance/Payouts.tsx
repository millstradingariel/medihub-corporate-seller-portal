import React, { useEffect, useState } from "react";
import { Building2, DollarSign, TrendingUp, Calendar, Search, Download, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

interface CompanyPayout {
    company_id: string;
    company_name: string;
    total_sales: number;
    referral_fees: number;
    total_orders: number;
}

type DateFilter = 'this_month' | 'last_month' | 'ytd' | 'all_time';

const Payouts: React.FC = () => {
    const [payouts, setPayouts] = useState<CompanyPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');

    const dateFilterOptions = [
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'ytd', label: 'Year to Date' },
        { value: 'all_time', label: 'All Time' },
    ];

    useEffect(() => {
        const fetchPayouts = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("firebaseToken");

                if (!token) {
                    setError("No authentication token found");
                    return;
                }

                const res = await fetch(`${API_URL}/api/finance/payouts?filter=${dateFilter}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const json = await res.json();
                setPayouts(json.data || []);
            } catch (err: any) {
                console.error("Failed to fetch payouts:", err);
                setError(err.message || "Failed to load payouts");
            } finally {
                setLoading(false);
            }
        };

        fetchPayouts();
    }, [dateFilter]);

    const filteredPayouts = payouts.filter(p =>
        p.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ✅ FIX: force numbers before summing
    const totalSales = filteredPayouts.reduce(
        (sum, p) => sum + Number(p.total_sales || 0),
        0
    );

    const totalReferralFees = filteredPayouts.reduce(
        (sum, p) => sum + Number(p.referral_fees || 0),
        0
    );

    const handleExport = () => {
        // Create CSV content
        const headers = ['Company Name', 'Total Sales', 'Referral Fees (22.5%)', 'Orders'];
        const rows = filteredPayouts.map(p => [
            p.company_name,
            `$${p.total_sales.toFixed(2)}`,
            `$${p.referral_fees.toFixed(2)}`,
            p.total_orders
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payouts-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

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
                        <DollarSign className="text-green-500" size={32} />
                        Company Payouts
                    </h1>
                    <p className="text-zinc-400 mt-1">Track sales and referral fees across all companies</p>
                </div>
                {/* <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                    <Download size={20} />
                    Export CSV
                </button> */}
            </div>

            {/* Filters Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Date Filter */}
                    <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-zinc-400" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {dateFilterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Building2 className="text-blue-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Total Companies</p>
                    <p className="text-3xl font-bold text-white">{filteredPayouts.length}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <DollarSign className="text-green-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Total Sales</p>
                    <p className="text-3xl font-bold text-white">${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <TrendingUp className="text-purple-500" size={24} />
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">Total Referral Fees (22.5%)</p>
                    <p className="text-3xl font-bold text-white">${totalReferralFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-950 border-b border-zinc-800">
                                <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} />
                                        Company Name
                                    </div>
                                </th>
                                <th className="text-right p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2 justify-end">
                                        <DollarSign size={16} />
                                        Total Sales
                                    </div>
                                </th>
                                <th className="text-right p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2 justify-end">
                                        <TrendingUp size={16} />
                                        Referral Fees (22.5%)
                                    </div>
                                </th>
                                <th className="text-center p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                    Orders
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                                        No payouts data found
                                    </td>
                                </tr>
                            ) : (
                                filteredPayouts.map((payout) => (
                                    <tr key={payout.company_id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                                    {payout.company_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-white font-medium">{payout.company_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-white font-mono text-lg">
                                                ${payout.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-green-400 font-mono text-lg font-semibold">
                                                ${payout.referral_fees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
                                                {payout.total_orders}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            {filteredPayouts.length > 0 && (
                <div className="text-sm text-zinc-400 text-center">
                    Showing {filteredPayouts.length} {filteredPayouts.length === 1 ? 'company' : 'companies'}
                </div>
            )}
        </div>
    );
};

export default Payouts;
