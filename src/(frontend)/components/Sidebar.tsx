import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, MapPin, Users, LogOut, X, Building2, ChevronDown, ChevronRight, UserCog, Shield, DollarSign, Receipt, Wallet } from 'lucide-react';
import Logo from './Logo';
import { IUser, Partner } from '../../../types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  partnerName: string;
  currentUser: Partner;
}

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  partnerName,
  currentUser,
}) => {
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const navItems = currentUser?.isSuperAdmin
    ? // CORPORATE PORTAL (super_admin, admin, viewer)
    currentUser.superAdminRole === 'super admin'
      ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'companies', label: 'Companies', icon: Building2 },
        {
          id: 'finance',
          label: 'Finance',
          icon: DollarSign,
          hasSubmenu: true,
          submenu: [
            { id: 'paid-orders', label: 'Paid Orders', icon: Receipt },
            { id: 'payouts', label: 'Payouts', icon: Wallet },
            { id: 'accounts', label: 'Accounts', icon: Building2 },
          ]
        },
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          hasSubmenu: true,
          submenu: [
            { id: 'company-users', label: 'Company Users', icon: UserCog },
            { id: 'admin-users', label: 'Admin Users', icon: Shield },
          ]
        },
      ]
      : currentUser.superAdminRole === 'admin'
        ? [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'companies', label: 'Companies', icon: Building2 },
          {
            id: 'finance',
            label: 'Finance',
            icon: DollarSign,
            hasSubmenu: true,
            submenu: [
              { id: 'paid-orders', label: 'Paid Orders', icon: Receipt },
              { id: 'payouts', label: 'Payouts', icon: Wallet },
              { id: 'accounts', label: 'Accounts', icon: Building2 },
            ]
          },
          {
            id: 'users',
            label: 'Users',
            icon: Users,
            hasSubmenu: true,
            submenu: [
              { id: 'company-users', label: 'Company Users', icon: UserCog },
              // NO Admin Users for corporate admin role
            ]
          },
        ]
        : // currentUser.superAdminRole === 'viewer'
        [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'companies', label: 'Companies', icon: Building2 },
          {
            id: 'finance',
            label: 'Finance',
            icon: DollarSign,
            hasSubmenu: true,
            submenu: [
              { id: 'paid-orders', label: 'Paid Orders', icon: Receipt },
              { id: 'payouts', label: 'Payouts', icon: Wallet },
              { id: 'accounts', label: 'Accounts', icon: Building2 },
            ]
          },
          // NO Users section at all for viewer
        ]
    : // SELLER PORTAL (company_super_admin, company_admin)
    currentUser?.companyRole === 'company super admin'
      ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'sales', label: 'Analytics', icon: ShoppingCart },
        { id: 'locations', label: 'Locations', icon: MapPin },
        { id: 'locations', label: 'Locations', icon: MapPin },

        {
          id: 'users',
          label: 'Users',
          icon: Users,
          hasSubmenu: true,
          submenu: [
            { id: 'company-users', label: 'Company Users', icon: UserCog },
          ]
        },
      ]
      : // currentUser?.companyRole === 'company_admin'
      [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'sales', label: 'Analytics', icon: ShoppingCart },
        { id: 'locations', label: 'Locations', icon: MapPin },
        // NO Users section for company_admin
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 text-white transform transition-transform duration-200 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 flex flex-col h-full`}
      >
        {/* Logo / Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center h-10">
            <Logo className="h-9 w-auto" />
          </div>
          <button
            className="lg:hidden text-zinc-400 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-zinc-800">
          <p className="text-sm text-zinc-400">Logged in as</p>
          <p className="text-white font-medium truncate">{partnerName}</p>
          {currentUser?.isSuperAdmin && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
              Super Admin
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const hasSubmenu = item.hasSubmenu && item.submenu;
            const isSubmenuActive = hasSubmenu && item.submenu?.some(sub => activePage === sub.id);
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id}>
                {/* Main Item */}
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleSubmenu(item.id);
                    } else {
                      handleNavigate(item.id);
                    }
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
                  {hasSubmenu && (
                    isExpanded ?
                      <ChevronDown size={16} className="text-zinc-400" /> :
                      <ChevronRight size={16} className="text-zinc-400" />
                  )}
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
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
