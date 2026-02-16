import React, { useEffect, useState } from "react";
import { Company } from "../../../../types";
import { Building2, Calendar, FileText, Search, Loader2, LogIn, Hash } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CompaniesProps {
  onViewAs: (company: Company) => void;
}

const Companies: React.FC<CompaniesProps> = ({ onViewAs }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${API_URL}/api/company/view`);
        const json = await res.json();
        setCompanies(json.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load companies");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_abn.includes(searchQuery)
  );

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
    <div className="min-h-screen w-full">
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">      {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="text-indigo-500" size={32} />
              Companies
            </h1>
            <p className="text-zinc-400 mt-1">Manage all registered companies</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search by company name or ABN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Building2 className="text-indigo-500" size={24} />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Total Companies</p>
                <p className="text-2xl font-bold text-white">{companies.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Calendar className="text-indigo-500" size={24} />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Active This Month</p>
                <p className="text-2xl font-bold text-white">
                  {companies.filter(c => {
                    const createdDate = new Date(c.created_at);
                    const now = new Date();
                    return createdDate.getMonth() === now.getMonth() &&
                      createdDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <FileText className="text-indigo-500" size={24} />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Search Results</p>
                <p className="text-2xl font-bold text-white">{filteredCompanies.length}</p>
              </div>
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
                    <div className="flex items-center gap-2"><Hash size={16} /> ID</div>
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2"><Building2 size={16} /> Name</div>
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2"><FileText size={16} /> ABN</div>
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {currentCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                      No companies found
                    </td>
                  </tr>
                ) : (
                  currentCompanies.map((c) => (
                    <tr key={c._id || c.company_id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="p-4">
                        <span className="text-zinc-400 font-mono text-sm">{c.company_id}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {c.company_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-white font-medium">{c.company_name}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-zinc-300 font-mono text-sm">{c.company_abn}</span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => onViewAs(c)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <LogIn size={14} />
                          Connect
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
        {filteredCompanies.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
            <p>
              Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
              <span className="text-white font-medium">{Math.min(endIndex, filteredCompanies.length)}</span> of{' '}
              <span className="text-white font-medium">{filteredCompanies.length}</span> companies
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
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    const showEllipsis =
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2);
                    if (showEllipsis) return <span key={page} className="px-2 text-zinc-600">...</span>;
                    if (!showPage) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'
                          }`}
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

export default Companies;