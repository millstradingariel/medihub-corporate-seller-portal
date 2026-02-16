import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  MapPin,
  Users,
  UserCog,
  LogOut,
  X,
  Building2,
  ChevronDown,
  ChevronRight,
  Shield,
  DollarSign,
  Wallet,
  ShoppingBag,
  Eye,
  Plus,
  History,
  LogOutIcon,
} from 'lucide-react';
import Logo from './Logo';
import { Partner, Company } from '../../../types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  currentUser: Partner;
  viewAsCompany: Company | null; // ✅ add this
  handleExitViewAs: () => void; // ✅ add this
  originalUser: Partner | null; // ✅ add this

}

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  currentUser,
  viewAsCompany,
  handleExitViewAs,
  originalUser,
}) => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const getRoleBadge = () => {
    if (currentUser?.isSuperAdmin) {
      // ✅ Check role_name (with underscores)
      if (currentUser.superAdminRole === 'super_admin') {
        return { text: 'Super Admin', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' };
      } else if (currentUser.superAdminRole === 'admin') {
        return { text: 'Admin', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' };
      } else if (currentUser.superAdminRole === 'viewer') {
        return { text: 'Viewer', bgColor: 'bg-green-500/20', textColor: 'text-green-400' };
      }
    } else if (currentUser?.companyRole) {
      // ✅ Check role_name (with underscores)
      if (currentUser.companyRole === 'company_super_admin') {
        return { text: 'Company Super Admin', bgColor: 'bg-red-500/20', textColor: 'text-red-400' };
      } else if (currentUser.companyRole === 'company_admin') {
        return { text: 'Company Admin', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' };
      } else if (currentUser.companyRole === 'company_viewer') {
        return { text: 'Company Viewer', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' };
      }
    }
    return null;
  };

  const roleBadge = getRoleBadge();

  // ✅ Navigation based on role_type and specific roles
  const navItems = currentUser?.roleType === 'corporate'
    ? // Corporate users (super_admin, admin, viewer)
    currentUser.superAdminRole === 'super_admin'
      ? [
        // Super Admin - Full access
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'companies', label: 'Companies', icon: Building2 },
        {
          id: 'finance',
          label: 'Finance',
          icon: DollarSign,
          hasSubmenu: true,
          submenu: [
            { id: 'payouts', label: 'Payouts', icon: Wallet },
            { id: 'accounts', label: 'Accounts', icon: Building2 },
          ],
        },
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          hasSubmenu: true,
          submenu: [
            { id: 'corporate-users', label: 'Corporate', icon: UserCog },
            { id: 'seller-users', label: 'Seller', icon: UserCog },
            { id: 'roles', label: 'Roles', icon: ShieldCheck },
          ],
        },
        { id: 'audit-logs', label: 'Audit Logs', icon: History },
      ]
      : currentUser.superAdminRole === 'admin'
        ? [
          // Admin - No admin user management
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'companies', label: 'Companies', icon: Building2 },
          {
            id: 'finance',
            label: 'Finance',
            icon: DollarSign,
            hasSubmenu: true,
            submenu: [
              { id: 'payouts', label: 'Payouts', icon: Wallet },
              { id: 'accounts', label: 'Accounts', icon: Building2 },
            ],
          },
          {
            id: 'users',
            label: 'Users',
            icon: Users,
            hasSubmenu: true,
            submenu: [
              { id: 'company-users', label: 'Company Users', icon: UserCog },
            ],
          },
        ]
        : [
          // Viewer - Read-only
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'companies', label: 'Companies', icon: Building2 },
          {
            id: 'finance',
            label: 'Finance',
            icon: DollarSign,
            hasSubmenu: true,
            submenu: [
              { id: 'payouts', label: 'Payouts', icon: Wallet },
              { id: 'accounts', label: 'Accounts', icon: Building2 },
            ],
          },
        ]
    :
    currentUser?.companyRole === 'company_super_admin'
      ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'locations', label: 'Sales', icon: DollarSign },
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingBag,
          hasSubmenu: true,
          submenu: [
            { id: 'view-orders', label: 'View Orders', icon: Eye },
            { id: 'create-orders', label: 'Create Orders', icon: Plus },
            { id: 'orders-history', label: 'Orders History', icon: History },
          ],
        },
        { id: 'seller-users', label: 'Users', icon: Users },

        { id: 'audit-logs', label: 'Audit Logs', icon: History },
      ]
      : currentUser?.companyRole === 'company_admin'
        ? [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'locations', label: 'Locations', icon: MapPin },
          { id: 'orders', label: 'Orders', icon: Wallet },
        ]
        : [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'locations', label: 'Locations', icon: MapPin },
        ];

  const handleNavigate = (pageId: string) => {
    onNavigate(pageId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 text-white transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col h-full`}
      >
        {/* Logo / Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <Logo className="h-9 w-auto" />
          <button
            className="lg:hidden text-zinc-400 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800">
          {originalUser?.isSuperAdmin && viewAsCompany ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-indigo-400 font-medium">Logged in as</p>
              </div>
              <p className="text-white font-medium truncate">{viewAsCompany.company_name}</p>
              <p className="text-zinc-500 text-xs truncate mt-0.5">{originalUser.name || originalUser.email}</p>
              <button
                onClick={handleExitViewAs}
                className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <LogOutIcon size={16} /><span className="font-semibold">Disconnect</span>
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400">Logged in as</p>
              <p className="text-white font-medium truncate pl-2">{currentUser.name || currentUser.email}</p>
              {roleBadge && (
                <span className={`inline-block mt-1 px-2 py-1 text-xs ${roleBadge.bgColor} ${roleBadge.textColor} rounded`}>
                  {roleBadge.text}
                </span>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const hasSubmenu = item.hasSubmenu && item.submenu;
            const isSubmenuActive = hasSubmenu && item.submenu?.some((sub) => activePage === sub.id);
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id}>
                {/* Main Item */}
                <button
                  onClick={() => {
                    if (hasSubmenu) toggleSubmenu(item.id);
                    else handleNavigate(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isActive || isSubmenuActive
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {hasSubmenu && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                </button>

                {/* Submenu */}
                {hasSubmenu && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.submenu?.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activePage === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleNavigate(subItem.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isSubActive
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'
                            }`}
                        >
                          <SubIcon size={18} />
                          <span className="text-sm font-medium">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-zinc-800">
          {!viewAsCompany && (
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;