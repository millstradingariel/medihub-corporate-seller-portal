import React, { useEffect, useState } from "react";
import { UserCog, Plus, X, Building2, Mail, Shield, Calendar, Search, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CompanyUser {
  id: number;
  email: string;
  company_id: string;
  company_name: string;
  role: string;
  created_at: string;
}

interface Company {
  _id: string;
  company_id: number;
  company_name: string;
}

const CompanyUsers: React.FC = () => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_id: '',
    role: 'company super admin'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem("firebaseToken");
        const res = await fetch(`${API_URL}/api/companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        setCompanies(json.data || []);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("firebaseToken");
      const res = await fetch(`${API_URL}/api/company-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem("firebaseToken");
      
      const res = await fetch(`${API_URL}/api/company-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      // Success - refresh list and close modal
      await fetchUsers();
      setIsModalOpen(false);
      setFormData({ email: '', password: '', company_id: '', role: 'staff' });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = selectedCompanyFilter === 'all' || user.company_id === selectedCompanyFilter;
    return matchesSearch && matchesCompany;
  });

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
            <UserCog className="text-blue-500" size={32} />
            Company Users
          </h1>
          <p className="text-zinc-400 mt-1">Manage users across all companies</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Company Filter */}
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-zinc-400" />
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Companies</option>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <UserCog className="text-blue-500" size={24} />
          </div>
          <div>
            <p className="text-zinc-400 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-white">{filteredUsers.length}</p>
          </div>
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
                    <Mail size={16} />
                    Email
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} />
                    Company
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Shield size={16} />
                    Role
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Date Created
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <span className="text-white font-medium">{user.email}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          {user.company_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white">{user.company_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus size={24} className="text-blue-500" />
                Add Company User
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Company
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="company super admin">Company Super Admin</option>
                  <option value="company admin">Company Admin</option>
                </select>
              </div>

              {/* Error Message */}
              {formError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyUsers;
