import React, { useEffect, useState } from "react";
import { Company } from "../../../../types";
import { Building2, Calendar, Hash, FileText, Search, Loader2, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CompanyAccountsProps {
  onViewAccount: (companyId: string, companyName: string) => void;
}

const CompanyAccounts: React.FC<CompanyAccountsProps> = ({ onViewAccount }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${API_URL}/api/companies`);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="text-blue-500" size={32} />
            Company Accounts
          </h1>
          <p className="text-zinc-400 mt-1">View financial data for each company</p>
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
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="text-blue-500" size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Companies</p>
              <p className="text-2xl font-bold text-white">{companies.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Calendar className="text-green-500" size={24} />
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
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileText className="text-purple-500" size={24} />
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
                  <div className="flex items-center gap-2">
                    <Hash size={16} />
                    ID
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} />
                    Company Name
                  </div>
                </th>
                <th className="text-center p-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {currentCompanies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-500">
                    No companies found
                  </td>
                </tr>
              ) : (
                currentCompanies.map((c) => (
                  <tr key={c._id || c.company_id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <span className="text-zinc-400 font-mono text-sm">#{c.company_id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {c.company_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{c.company_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => onViewAccount(c.company_id, c.company_name)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                        >
                          <Eye size={16} />
                          View Account
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

      {/* Footer with Pagination */}
      {filteredCompanies.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <p>
            Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
            <span className="text-white font-medium">{Math.min(endIndex, filteredCompanies.length)}</span> of{' '}
            <span className="text-white font-medium">{filteredCompanies.length}</span> companies
          </p>

          {/* Pagination Controls */}
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

                  if (showEllipsis) {
                    return <span key={page} className="px-2 text-zinc-600">...</span>;
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
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
  );
};

export default CompanyAccounts;
