import React, { useEffect, useState } from "react";
import { Building2, DollarSign, TrendingUp, Calendar, Search, Download, Loader2, Menu } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CompanyPayout {
    company_id: string;
    company_name: string;
    total_sales: number;
    referral_fees: number;
    total_orders: number;
}

type DateFilter = 'all_time' | 'by_year' | 'by_month';

const Payouts: React.FC = () => {
    const [payouts, setPayouts] = useState<CompanyPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // last 5 years
    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' },
        { value: 3, label: 'March' }, { value: 4, label: 'April' },
        { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' },
        { value: 9, label: 'September' }, { value: 10, label: 'October' },
        { value: 11, label: 'November' }, { value: 12, label: 'December' },
    ];
    const [dateFilter, setDateFilter] = useState<DateFilter>('all_time');
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, dateFilter, selectedYear, selectedMonth]);

    useEffect(() => {
        const fetchPayouts = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('supabaseToken');

                const params = new URLSearchParams({ filter: dateFilter });
                if (dateFilter === 'by_year' || dateFilter === 'by_month') {
                    params.append('year', String(selectedYear));
                }
                if (dateFilter === 'by_month') {
                    params.append('month', String(selectedMonth));
                }

                const res = await fetch(`${API_URL}/api/finance/payouts?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const json = await res.json();
                setPayouts(json.data || []);
            } catch (err: any) {
                setError(err.message || "Failed to load payouts");
            } finally {
                setLoading(false);
            }
        };

        fetchPayouts();
    }, [dateFilter, selectedYear, selectedMonth]);

    const filteredPayouts = payouts.filter(p => {
        const matchesSearch = p.company_name.toLowerCase().includes(searchQuery.toLowerCase());

        // date filtering will be done per order in future
        // for now backend already aggregates — just return all
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredPayouts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPayouts = filteredPayouts.slice(startIndex, startIndex + itemsPerPage)

    // ✅ FIX: force numbers before summing
    const totalSales = filteredPayouts.reduce(
        (sum, p) => sum + Number(p.total_sales || 0),
        0
    );

    const totalReferralFees = filteredPayouts.reduce(
        (sum, p) => sum + Number(p.referral_fees || 0),
        0
    );

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                            <DollarSign className="text-indigo-500 flex-shrink-0" size={24} />
                            <span className="truncate">Payouts</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-2">
                            Track sales and consultation fees across all companies
                        </p>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Calendar size={18} className="text-zinc-400 flex-shrink-0" />

                            {/* Filter Type */}
                            <select
                                value={dateFilter}
                                onChange={(e) => { setDateFilter(e.target.value as DateFilter); setCurrentPage(1); }}
                                className="px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all_time">All Time</option>
                                <option value="by_year">By Year</option>
                                <option value="by_month">By Month & Year</option>
                            </select>

                            {/* Year Selector — show for by_year and by_month */}
                            {(dateFilter === 'by_year' || dateFilter === 'by_month') && (
                                <select
                                    value={selectedYear}
                                    onChange={(e) => { setSelectedYear(Number(e.target.value)); setCurrentPage(1); }}
                                    className="px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            )}

                            {/* Month Selector — show only for by_month */}
                            {dateFilter === 'by_month' && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => { setSelectedMonth(Number(e.target.value)); setCurrentPage(1); }}
                                    className="px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Total Companies */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <Building2 className="text-indigo-500" size={20} />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm mb-1">Total Companies</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">{filteredPayouts.length}</p>
                    </div>

                    {/* Total Sales */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <DollarSign className="text-indigo-500" size={20} />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm mb-1">Total Sales</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-all">
                            ${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Total Referral Fees */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <TrendingUp className="text-indigo-500" size={20} />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm mb-1">Total Consultation Fees (22.5%)</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-all">
                            ${totalReferralFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Table - Desktop View (md and up) */}
                <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800">
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="flex-shrink-0" />
                                            <span className="truncate">Company Name</span>
                                        </div>
                                    </th>
                                    <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2 justify-end">
                                            <DollarSign size={14} className="flex-shrink-0" />
                                            <span className="truncate">Total Sales</span>
                                        </div>
                                    </th>
                                    <th className="text-right p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2 justify-end">
                                            <TrendingUp size={14} className="flex-shrink-0" />
                                            <span className="truncate">Fees (22.5%)</span>
                                        </div>
                                    </th>
                                    <th className="text-center p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        Orders
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {currentPayouts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 sm:p-8 text-center text-sm text-zinc-500">
                                            No payouts data found
                                        </td>
                                    </tr>
                                ) : (
                                    currentPayouts.map((payout) => (
                                        <tr key={payout.company_id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-3 lg:p-4">
                                                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                        {payout.company_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium text-sm lg:text-base truncate">
                                                        {payout.company_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 lg:p-4 text-right">
                                                <span className="text-white font-mono text-sm lg:text-lg">
                                                    ${Number(payout.total_sales).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="p-3 lg:p-4 text-right">
                                                <span className="text-white font-mono text-sm lg:text-lg font-semibold">
                                                    ${Number(payout.referral_fees).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="p-3 lg:p-4 text-center">
                                                <span className="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium bg-indigo-500/20 text-indigo-400">
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

                {/* Card View - Mobile (below md) */}
                <div className="md:hidden space-y-3">
                    {currentPayouts.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-sm text-zinc-500">
                            No payouts data found
                        </div>
                    ) : (
                        currentPayouts.map((payout) => (
                            <div
                                key={payout.company_id}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3"
                            >
                                {/* Company Header */}
                                <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                                        {payout.company_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-white font-medium text-base truncate">
                                            {payout.company_name}
                                        </h3>
                                        <p className="text-zinc-500 text-xs">
                                            {payout.total_orders} {payout.total_orders === 1 ? 'order' : 'orders'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Total Sales */}
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            <DollarSign size={14} className="text-zinc-400" />
                                            <p className="text-xs text-zinc-400">Total Sales</p>
                                        </div>
                                        <p className="text-lg font-mono font-semibold text-white break-all">
                                            ${Number(payout.total_sales).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>

                                    {/* Referral Fees */}
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            <TrendingUp size={14} className="text-zinc-400" />
                                            <p className="text-xs text-zinc-400">Fees (22.5%)</p>
                                        </div>
                                        <p className="text-lg font-mono font-semibold text-green-400 break-all">
                                            ${Number(payout.referral_fees).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {filteredPayouts.length > itemsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
                        <p>
                            Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
                            <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredPayouts.length)}</span> of{' '}
                            <span className="text-white font-medium">{filteredPayouts.length}</span> companies
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                                        const showEllipsis = (page === currentPage - 2 && currentPage > 3) || (page === currentPage + 2 && currentPage < totalPages - 2);
                                        if (showEllipsis) return <span key={page} className="px-2 text-zinc-600">...</span>;
                                        if (!showPage) return null;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payouts;