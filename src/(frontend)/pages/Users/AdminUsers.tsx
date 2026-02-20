import React, { useEffect, useState } from "react";
import {
  UserCog,
  Plus,
  X,
  Building2,
  Mail,
  Shield,
  Calendar,
  Search,
  Loader2
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "super admin"
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("firebaseToken");

      const res = await fetch(`${API_URL}/api/super-admin-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      setUsers(json.data || []);
    } catch (err: any) {
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

      const res = await fetch(`${API_URL}/api/super-admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create user");
      }

      await fetchUsers();
      setIsModalOpen(false);
      setFormData({
        email: "",
        password: "",
        name: "",
        role: "super admin"
      });
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading
  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
        <div className="text-red-400 text-center">
          <p className="text-lg sm:text-xl font-semibold">Error</p>
          <p className="text-sm mt-2 break-words">{error}</p>
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
              <UserCog className="text-blue-500 flex-shrink-0" size={24} />
              <span className="truncate">Admin Users</span>
            </h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">
              Manage admin users
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium w-full sm:w-auto"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserCog className="text-blue-500" size={22} />
            </div>
            <div>
              <p className="text-zinc-400 text-xs sm:text-sm">Total Users</p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {filteredUsers.length}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800">
                  <th className="p-4 text-left text-xs text-zinc-400 uppercase">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      Email
                    </div>
                  </th>
                  <th className="p-4 text-left text-xs text-zinc-400 uppercase">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} />
                      Name
                    </div>
                  </th>
                  <th className="p-4 text-left text-xs text-zinc-400 uppercase">
                    <div className="flex items-center gap-2">
                      <Shield size={16} />
                      Role
                    </div>
                  </th>
                  <th className="p-4 text-left text-xs text-zinc-400 uppercase">
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
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/50">
                      <td className="p-4 text-white font-medium">{u.email}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 capitalize">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400 text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
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
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{u.name}</p>
                  <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-400">Role</p>
                  <p className="text-white capitalize">{u.role}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Created</p>
                  <p className="text-white">
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Plus size={20} />
                  Add Admin User
                </h2>

                <button onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  required
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  required
                />

                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                >
                  <option value="super admin">Super Admin</option>
                  <option value="admin">Admin</option>
                </select>

                {formError && (
                  <div className="text-red-400 text-sm">{formError}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white"
                  >
                    {submitting ? "Adding..." : "Add User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;