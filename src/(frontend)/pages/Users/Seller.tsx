import React, { useEffect, useState } from "react";
import { UserCog, Plus, X, Building2, Mail, Shield, Calendar, Search, Loader2, Edit, Archive, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Partner } from "../../../../types";

const API_URL = import.meta.env.VITE_API_URL;

interface CompanyUser {
    id: number;
    name: string;
    email: string;
    company_id: string;
    company_name: string;
    role_id: number;
    role_name: string;
    role_display_name: string;
    created_at: string;
    is_active: number;
}

interface Company {
    _id: string;
    company_id: number;
    company_name: string;
}

interface Role {
    id: number;
    name: string;
    display_name: string;
    role_type: string;
}

interface CompanyUsersProps {
    currentUser: Partner;
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'pending'>('all');
    const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        userId: null as number | null,
        userName: '',
        isLoading: false
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        company_id: '',
        role_id: '',
        is_active: 2,

    });
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Fetch company roles on mount
    useEffect(() => {
        fetchCompanyRoles();
    }, []);

    // Fetch companies (only for super admins)
    useEffect(() => {
        if (!currentUser.isSuperAdmin) return;

        const fetchCompanies = async () => {
            try {
                const token = localStorage.getItem('supabaseToken');
                const res = await fetch(`${API_URL}/api/company/view`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                setCompanies(json.data || []);
            } catch (err) {
                console.error("Failed to fetch companies:", err);
            }
        };

        fetchCompanies();
    }, [currentUser.isSuperAdmin]);

    // Fetch company roles (role_type = 'company')
    const fetchCompanyRoles = async () => {
        try {
            const token = localStorage.getItem('supabaseToken');
            const res = await fetch(`${API_URL}/api/roles?role_type=company`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const json = await res.json();
            setRoles(json.data || []);

            if (json.data && json.data.length > 0) {
                setFormData(prev => ({ ...prev, role_id: json.data[0].id.toString() }));
            }
        } catch (err: any) {
            console.error("Failed to fetch roles:", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('supabaseToken');

            const url = currentUser?.companyId && !currentUser?.isSuperAdmin
                ? `${API_URL}/api/user/seller-users/view?companyId=${currentUser.companyId}`
                : `${API_URL}/api/user/seller-users/view`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorData = await res.json();

                console.log('❌ Backend error:', errorData); // ✅ add this

                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const json = await res.json();
            setUsers(json.data || []);
        } catch (err: any) {
            console.error("Failed to fetch users:", err);
            setError(err.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Open modal for creating new user
    const handleOpenModal = () => {
        setEditingUser(null);

        // ✅ Use currentUser.companyId — works for both real company users and impersonation
        const prefilledCompanyId = !currentUser.isSuperAdmin
            ? String(currentUser.companyId || '')
            : '';

        setFormData({
            name: '',
            email: '',
            password: '',
            company_id: prefilledCompanyId,
            role_id: roles[0]?.id.toString() || '',
            is_active: 2
        });

        setFormError(null);
        setIsModalOpen(true);
    };

    // Open modal for editing existing user
    const handleEditClick = (user: CompanyUser) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            company_id: user.company_id,
            role_id: user.role_id.toString(),
            is_active: user.is_active,

        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            const token = localStorage.getItem('supabaseToken');
            const isEditing = editingUser !== null;
            const url = isEditing
                ? `${API_URL}/api/user/seller-users/${editingUser.id}/update`
                : `${API_URL}/api/user/seller-users`;
            const method = isEditing ? 'PUT' : 'POST';

            const body = isEditing
                ? {
                    name: formData.name,
                    role_id: parseInt(formData.role_id),
                    is_active: formData.is_active // ✅ make sure this is here
                }
                : {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    company_id: parseInt(formData.company_id) || currentUser?.companyId,
                    role_id: parseInt(formData.role_id)
                };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
            }

            await fetchUsers();
            setIsModalOpen(false);
            setEditingUser(null);

            if (!currentUser.isSuperAdmin && currentUser.companyId) {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    company_id: String(currentUser.companyId),
                    role_id: roles[0]?.id.toString() || '',
                    is_active: 2,
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    company_id: '',
                    role_id: roles[0]?.id.toString() || '',
                    is_active: 2,
                });
            }
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchiveClick = (user: CompanyUser) => {
        setConfirmModal({
            isOpen: true,
            userId: user.id,
            userName: user.name,
            isLoading: false
        });
    };

    const handleConfirmArchive = async () => {
        if (!confirmModal.userId) return;

        setConfirmModal(prev => ({ ...prev, isLoading: true }));

        try {
            const token = localStorage.getItem('supabaseToken');
            const res = await fetch(`${API_URL}/api/user/corporate/${confirmModal.userId}/archive`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to archive user');
            }

            await fetchUsers();

            setConfirmModal({
                isOpen: false,
                userId: null,
                userName: '',
                isLoading: false
            });
        } catch (err: any) {
            console.error("Archive error:", err);
            alert(`Error archiving user: ${err.message}`);
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCancelArchive = () => {
        setConfirmModal({
            isOpen: false,
            userId: null,
            userName: '',
            isLoading: false
        });
    };

    // 1️⃣ State — at the top with all other useState declarations
    const [currentPage, setCurrentPage] = useState(1);

    // 2️⃣ Reset page effect — with all other useEffects
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCompanyFilter, statusFilter]);

    // 3️⃣ Filter users — clean, no hooks inside
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.company_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCompany = selectedCompanyFilter === 'all' || user.company_id === selectedCompanyFilter;

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = user.is_active === 1;
        else if (statusFilter === 'archived') matchesStatus = user.is_active === 0;
        else if (statusFilter === 'pending') matchesStatus = user.is_active === 2;

        return matchesSearch && matchesCompany && matchesStatus;
    });

    // 4️⃣ Pagination — after filteredUsers
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    // 5️⃣ Stats
    const activeCount = users.filter(u => u.is_active === 1).length;
    const archivedCount = users.filter(u => u.is_active === 0).length;
    const pendingCount = users.filter(u => u.is_active === 2).length;


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
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                            <UserCog className="text-indigo-500 flex-shrink-0" size={24} />
                            <span className="truncate">Seller</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            {currentUser.isSuperAdmin
                                ? 'Manage users across all companies'
                                : `Users in ${currentUser.companyName}`
                            }
                        </p>
                    </div>

                    {!currentUser.isSuperAdmin && (
                        <button
                            onClick={handleOpenModal}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            Create
                        </button>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <UserCog className="text-indigo-500" size={20} />
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs sm:text-sm">Total Users</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{users.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Active */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <CheckCircle className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs sm:text-sm">Active</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{activeCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Inactive */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <XCircle className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs sm:text-sm">Archived</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{archivedCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
                                <Clock className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <p className="text-zinc-400 text-xs sm:text-sm">Pending</p>
                                <p className="text-xl sm:text-2xl font-bold text-white">{pendingCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:gap-4">

                        {/* Company Filter & Status Filter Row */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            {currentUser.isSuperAdmin && (
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Building2 size={18} className="text-zinc-400 flex-shrink-0" />
                                    <select
                                        value={selectedCompanyFilter}
                                        onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Companies</option>
                                        {companies.map((company) => (
                                            <option key={company.company_id} value={company.company_id}>
                                                {company.company_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Status Filter */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-xs sm:text-sm text-zinc-400 font-medium whitespace-nowrap">Status:</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStatusFilter('all')}
                                        className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${statusFilter === 'all'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('active')}
                                        className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 ${statusFilter === 'active'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        <CheckCircle size={14} />
                                        <span>Active</span>
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('archived')}
                                        className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 ${statusFilter === 'archived'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        <XCircle size={14} />
                                        <span>Archived</span>
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('pending')}
                                        className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1 ${statusFilter === 'pending'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        <Clock size={14} />
                                        <span>Pending</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800">
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <UserCog size={14} />
                                            <span>Name</span>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} />
                                            <span>Email</span>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} />
                                            <span>Company</span>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} />
                                            <span>Role</span>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <span>Status</span>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            <span>Date Created</span>
                                        </div>
                                    </th>
                                    <th className="text-left p-3 lg:p-4 text-xs lg:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                                        <span>Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-6 sm:p-8 text-center text-sm text-zinc-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    currentUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="p-3 lg:p-4">
                                                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white text-sm lg:text-base truncate">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                <span className="text-zinc-300 text-sm lg:text-base">{user.email}</span>
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {user.company_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white text-sm lg:text-base truncate">{user.company_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                <span className="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium text-white capitalize">
                                                    {user.role_display_name || user.role_name}
                                                </span>
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                {user.is_active === 1 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                        <span className="text-xs lg:text-sm text-white font-medium">Active</span>
                                                    </div>
                                                ) : user.is_active === 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                        <span className="text-xs lg:text-sm text-white font-medium">Archived</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                        <span className="text-xs lg:text-sm text-white font-medium">Pending</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                <span className="text-zinc-400 text-xs lg:text-sm">
                                                    {new Date(user.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="p-3 lg:p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-zinc-800"
                                                        title="Edit user"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleArchiveClick(user)}
                                                        className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-zinc-800"
                                                        title="Archive user"
                                                    >
                                                        <Archive size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-sm text-zinc-500">
                            No users found
                        </div>
                    ) : (
                        currentUsers.map((user) => (
                            <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {(user.name || user.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-medium text-base truncate">{user.name || 'N/A'}</h3>
                                            <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-2 text-zinc-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-zinc-800"
                                            title="Edit user"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleArchiveClick(user)}
                                            className="p-2 text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
                                            title="Archive user"
                                        >
                                            <Archive size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">Company</p>
                                        <p className="text-sm text-white truncate">{user.company_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">Role</p>
                                        <p className="text-sm text-white capitalize truncate">{user.role_display_name || user.role_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">Status</p>
                                        <div className="flex items-center gap-1">
                                            {user.is_active === 1 ? (
                                                <>
                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                    <p className="text-sm text-green-400 font-medium">Active</p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                    <p className="text-sm text-red-400 font-medium">Inactive</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-400 mb-1">Created</p>
                                        <p className="text-sm text-white">
                                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    {editingUser ? (
                                        <>
                                            <Edit size={20} className="text-indigo-500 flex-shrink-0" />
                                            <span className="truncate">Edit User</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} className="text-indigo-500 flex-shrink-0" />
                                            <span className="truncate">Create User</span>
                                        </>
                                    )}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                {!editingUser && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="user@example.com"
                                            className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                )}

                                {!editingUser && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">Password</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Enter password"
                                            className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                )}

                                {!editingUser && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">Company</label>

                                        {currentUser?.isSuperAdmin ? (
                                            <select
                                                value={formData.company_id}
                                                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                                className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            >
                                                <option value="">Select a company</option>
                                                {companies.map((company) => (
                                                    <option key={company.company_id} value={company.company_id}>
                                                        {company.company_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <>
                                                <div className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300">
                                                    {currentUser.companyName}
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    Users will be added to your company
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">Role</label>
                                    <select
                                        value={formData.role_id}
                                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        {roles.length === 0 ? (
                                            <option value="">Loading roles...</option>
                                        ) : (
                                            roles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.display_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Only seller portal roles are shown
                                    </p>
                                </div>

                                {editingUser && editingUser.is_active === 0 && (
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active === 1}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    is_active: e.target.checked ? 1 : 0
                                                })}
                                                className="w-4 h-4 accent-indigo-500"
                                            />
                                            <span className="text-sm text-white">Set Active</span>
                                        </label>
                                    </div>
                                )}

                                {formError && (
                                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-xs sm:text-sm">
                                        {formError}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || roles.length === 0}
                                        className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Processing...' : editingUser ? 'Update User' : 'Add User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Archive Confirmation Modal */}
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md">
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/20">
                                        <AlertTriangle size={20} className="text-indigo-400" />
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white">Archive</h2>
                                </div>
                                <button
                                    onClick={handleCancelArchive}
                                    disabled={confirmModal.isLoading}
                                    className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6">
                                <p className="text-sm sm:text-base text-zinc-300 mb-6">
                                    Are you sure you want to archive <span className="font-semibold text-white">{confirmModal.userName}</span>?
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleCancelArchive}
                                        disabled={confirmModal.isLoading}
                                        className="flex-1 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmArchive}
                                        disabled={confirmModal.isLoading}
                                        className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {confirmModal.isLoading && <Loader2 size={16} className="animate-spin" />}
                                        <span>{confirmModal.isLoading ? 'Archiving...' : 'Archive'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {filteredUsers.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
                    <p>
                        Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
                        <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
                        <span className="text-white font-medium">{filteredUsers.length}</span> users
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
                                            className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'}`}
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
    );
};

export default CompanyUsers;