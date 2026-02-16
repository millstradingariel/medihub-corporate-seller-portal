import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  role_type: 'corporate' | 'company';
  is_system_role: boolean;
  permissions_count: number;
  permissions?: Permission[];
}

interface PermissionsByCategory {
  [category: string]: Permission[];
}

const RoleManagement: React.FC = () => {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'corporate' | 'company'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    role_type: 'company' as 'corporate' | 'company',
    permission_ids: [] as number[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    Promise.all([fetchRoles(), fetchPermissions()])
      .finally(() => setLoading(false));
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('supabaseToken');
      const res = await fetch(`${API_URL}/api/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setRoles(json.data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('supabaseToken');
      const res = await fetch(`${API_URL}/api/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setPermissions(json.data || {});

      // Auto-expand first category
      const categories = Object.keys(json.data || {});
      if (categories.length > 0) {
        setExpandedCategories(new Set([categories[0]]));
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const fetchRoleDetails = async (roleId: number) => {
    try {
      const token = localStorage.getItem('supabaseToken');
      const res = await fetch(`${API_URL}/api/roles/${roleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.error('Error fetching role details:', err);
      return null;
    }
  };

  // Handle create role
  const handleCreate = () => {
    setModalMode('create');
    setSelectedRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      role_type: 'company',
      permission_ids: []
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle edit role
  const handleEdit = async (role: Role) => {
    const roleDetails = await fetchRoleDetails(role.id);
    if (!roleDetails) return;

    setModalMode('edit');
    setSelectedRole(roleDetails);
    setFormData({
      name: roleDetails.name,
      display_name: roleDetails.display_name,
      description: roleDetails.description || '',
      role_type: roleDetails.role_type,
      permission_ids: roleDetails.permissions.map((p: Permission) => p.id)
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    role: null as Role | null,
    isLoading: false
  });

  const handleDelete = (role: Role) => {
    setDeleteModal({ isOpen: true, role, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.role) return;
    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const token = localStorage.getItem('supabaseToken');
      const res = await fetch(`${API_URL}/api/roles/${deleteModal.role.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to delete role');

      setDeleteModal({ isOpen: false, role: null, isLoading: false });
      fetchRoles();
    } catch (err: any) {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
      setFormError(err.message);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('supabaseToken');
      const url = modalMode === 'create'
        ? `${API_URL}/api/roles`
        : `${API_URL}/api/roles/${selectedRole?.id}`;

      const body = modalMode === 'create'
        ? formData
        : {
          display_name: formData.display_name,
          description: formData.description,
          permission_ids: formData.permission_ids
        };

      const res = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Failed to save role');
      }

      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionId: number) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...prev.permission_ids, permissionId]
    }));
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Select all permissions in category
  const selectAllInCategory = (category: string) => {
    const categoryPermissions = permissions[category];
    const allSelected = categoryPermissions.every(p =>
      formData.permission_ids.includes(p.id)
    );

    if (allSelected) {
      // Deselect all
      setFormData(prev => ({
        ...prev,
        permission_ids: prev.permission_ids.filter(id =>
          !categoryPermissions.some(p => p.id === id)
        )
      }));
    } else {
      // Select all
      const idsToAdd = categoryPermissions
        .map(p => p.id)
        .filter(id => !formData.permission_ids.includes(id));

      setFormData(prev => ({
        ...prev,
        permission_ids: [...prev.permission_ids, ...idsToAdd]
      }));
    }
  };

  // Filter roles
  const filteredRoles = filter === 'all'
    ? roles
    : roles.filter(r => r.role_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-zinc-400" />
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
              <Shield className="text-indigo-500 flex-shrink-0" size={24} />
              <span className="truncate">Role</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Manage roles and permissions dynamically
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            <span>Create</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('corporate')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'corporate' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
            >
              Corporate
            </button>
            <button
              onClick={() => setFilter('company')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'company' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
            >
              Company
            </button>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                    {role.display_name}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">
                    {role.role_type === 'corporate' ? 'Corporate Portal' : 'Company Portal'}
                  </p>
                </div>
                {role.is_system_role ? (
                  <span className="flex-shrink-0 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium flex items-center gap-1">
                    System (Protected)
                  </span>
                ) : (
                  <span className="flex-shrink-0 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium">
                    Custom
                  </span>
                )}
              </div>

              {role.description && (
                <p className="text-zinc-400 text-xs sm:text-sm mb-4 line-clamp-2">
                  {role.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <span className="text-zinc-400 text-xs sm:text-sm">
                  {role.permissions_count} permissions
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No roles found</p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-indigo-500" />
                  <span>{modalMode === 'create' ? 'Create Role' : 'Edit Role'}</span>
                  {selectedRole?.is_system_role && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      System Role
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

                {/* Name (only for create) */}
                {modalMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Role Name (Unique ID)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., sales_manager"
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      pattern="[a-z_]+"
                      title="Use lowercase letters and underscores only"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Use lowercase with underscores (e.g., sales_manager)
                    </p>
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g., Sales Manager"
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    disabled={modalMode === 'edit' && selectedRole?.is_system_role}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this role can do..."
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    disabled={modalMode === 'edit' && selectedRole?.is_system_role}
                  />
                </div>

                {/* Role Type (only for create) */}
                {modalMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Portal Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role_type: 'corporate' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${formData.role_type === 'corporate'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                          }`}
                      >
                        <div className="font-medium">Corporate</div>
                        <div className="text-xs mt-1">For admin portal</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role_type: 'company' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${formData.role_type === 'company'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                          }`}
                      >
                        <div className="font-medium">Company</div>
                        <div className="text-xs mt-1">For company portal</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Permissions ({formData.permission_ids.length} selected)
                  </label>

                  <div className="space-y-2">
                    {Object.entries(permissions).map(([category, perms]) => {
                      const isExpanded = expandedCategories.has(category);
                      const categoryPerms = perms as Permission[];
                      const allSelected = categoryPerms.every(p => formData.permission_ids.includes(p.id));
                      const someSelected = categoryPerms.some(p => formData.permission_ids.includes(p.id));

                      return (
                        <div key={category} className="border border-zinc-800 rounded-lg overflow-hidden">

                          {/* Category Header */}
                          <div className="flex items-center justify-between p-3 bg-zinc-950 hover:bg-zinc-900 transition-colors">
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                              <span className="font-medium text-white capitalize">{category}</span>
                              <span className="text-xs text-zinc-500">
                                ({categoryPerms.filter(p => formData.permission_ids.includes(p.id)).length}/{categoryPerms.length})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAllInCategory(category)}
                              className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          {/* Permissions List */}
                          {isExpanded && (
                            <div className="p-3 space-y-2 bg-zinc-900/50">
                              {categoryPerms.map((permission) => (
                                <label
                                  key={permission.id}
                                  className="flex items-start gap-3 p-2 rounded hover:bg-zinc-900 cursor-pointer transition-colors"
                                >
                                  <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={formData.permission_ids.includes(permission.id)}
                                      onChange={() => togglePermission(permission.id)}
                                      className="w-5 h-5 rounded border-2 border-zinc-700 bg-zinc-950 checked:bg-indigo-500 checked:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    {formData.permission_ids.includes(permission.id) && (
                                      <Check size={14} className="absolute text-white pointer-events-none" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white font-medium">
                                      {permission.display_name}
                                    </div>
                                    {permission.description && (
                                      <div className="text-xs text-zinc-500 mt-0.5">
                                        {permission.description}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error Message */}
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </form>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{modalMode === 'create' ? 'Create Role' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <Trash2 size={20} className="text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Delete Role</h2>
                </div>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, role: null, isLoading: false })}
                  disabled={deleteModal.isLoading}
                  className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-zinc-300 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-white">"{deleteModal.role?.display_name}"</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ isOpen: false, role: null, isLoading: false })}
                    disabled={deleteModal.isLoading}
                    className="flex-1 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteModal.isLoading}
                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteModal.isLoading && <Loader2 size={16} className="animate-spin" />}
                    {deleteModal.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;