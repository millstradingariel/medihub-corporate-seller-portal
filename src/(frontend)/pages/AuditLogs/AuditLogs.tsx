import React, { useEffect, useState, useCallback } from "react";
import { Partner } from "../../../../types";
import { Shield, Search, Filter, RefreshCw, Loader2, ChevronLeft, ChevronRight, LogIn, UserPlus, ShoppingBag, Key, Trash2, Edit, Eye } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

interface AuditLog {
    id: number;
    user_id: number;
    user_email: string;
    user_name: string;
    role_name: string;
    company_id: number;
    company_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
}

interface AuditLogsProps {
    currentUser: Partner;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    LOGIN: <LogIn size={14} />,
    CREATE_USER: <UserPlus size={14} />,
    CREATE_ORDER: <ShoppingBag size={14} />,
    EDIT_USER: <Edit size={14} />,
    ARCHIVE_USER: <Trash2 size={14} />,
    VIEW: <Eye size={14} />,
    ROLE_CHANGE: <Key size={14} />,
};

const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    CREATE_USER: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    CREATE_ORDER: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    EDIT_USER: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    ARCHIVE_USER: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    ROLE_CHANGE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    DEFAULT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    CREATE_ROLE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    EDIT_ROLE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    DELETE_ROLE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',

};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
};

const AuditLogs: React.FC<AuditLogsProps> = ({ currentUser }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 10; // ✅ was 20

    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('supabaseToken');

            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });

            if (!currentUser.isSuperAdmin && currentUser.companyId) {
                params.append('companyId', String(currentUser.companyId));
            }
            if (actionFilter) params.append('action', actionFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`${API_URL}/api/audit-logs?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            setLogs(json.data || []);
            setTotal(json.total || 0);
        } catch (err: any) {
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, startDate, endDate, currentUser]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log =>
        !searchQuery ||
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-indigo-500" size={32} />
                        Audit Logs
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        {currentUser.isSuperAdmin ? 'All system activity' : `Activity for ${currentUser.companyName}`}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search user, action..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="CREATE_USER">Create User</option>
                        <option value="EDIT_USER">Edit User</option>
                        <option value="ARCHIVE_USER">Archive User</option>
                        <option value="CREATE_ORDER">Create Order</option>
                        <option value="EDIT_ROLE">Edit Role</option>
                        <option value="ARCHIVE_ROLE">Archive Role</option>
                        <option value="CREATE_ROLE">Create Role</option>
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Logs', value: total, color: 'blue' },
                    { label: 'Logins', value: logs.filter(l => l.action === 'LOGIN').length, color: 'emerald' },
                    { label: 'Orders Created', value: logs.filter(l => l.action === 'CREATE_ORDER').length, color: 'purple' },
                    { label: 'User Changes', value: logs.filter(l => ['CREATE_USER', 'EDIT_USER', 'DELETE_USER'].includes(l.action)).length, color: 'amber' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <p className="text-zinc-400 text-xs">{stat.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-950 border-b border-zinc-800">
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">User</th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Action</th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Role</th>
                                <th className="text-left p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">No audit logs found</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4">
                                            <span className="text-zinc-400 text-xs font-mono">{formatDate(log.created_at)}</span>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="text-white text-sm font-medium">{log.user_name || '—'}</p>
                                                <p className="text-zinc-500 text-xs">{log.user_email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT}`}>
                                                {ACTION_ICONS[log.action]}
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                {log.role_name && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-zinc-700/50 text-zinc-300 text-xs rounded-full border border-zinc-600/30">
                                                        {log.role_name.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-400 text-xs">
                                                {log.details ? (
                                                    typeof log.details === 'string'
                                                        ? log.details
                                                        : Object.entries(JSON.parse(log.details))
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join(', ')
                                                ) : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {total > limit && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
                    <p>
                        Showing <span className="text-white font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="text-white font-medium">{Math.min(page * limit, total)}</span> of{' '}
                        <span className="text-white font-medium">{total}</span> logs
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                    const showPage = p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1);
                                    const showEllipsis = (p === page - 2 && page > 3) || (p === page + 2 && page < totalPages - 2);
                                    if (showEllipsis) return <span key={p} className="px-2 text-zinc-600">...</span>;
                                    if (!showPage) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-10 h-10 rounded-lg transition-colors ${page === p ? 'bg-indigo-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AuditLogs;