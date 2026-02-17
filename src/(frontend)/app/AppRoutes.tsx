import React from "react";
import Dashboard from "../pages/Dashboard/Dashboard";
import Sales from "../pages/Sales/Sales";
import KioskSales from "../pages/KioskSales/KioskSales";
import Locations from "../pages/Locations/Locations";
import Devices from "../pages/Devices/Devices";
import Feedback from "../pages/Feedback/Feedback";
// import UserList from "../(frontend)/pages/Usersss/UserList";
import Companies from "../pages/Company/Company";
import Accounts from "../pages/Finance/Accounts";
import Payouts from "../pages/Finance/Payouts";
import { Partner, Location, Order } from "../../../types";
import CompanyUsers from "../pages/Users/CompanyUsers";
import AdminUsers from "../pages/Users/AdminUsers";

type Page =
  | "dashboard"
  | "sales"
  | "locations"
  | "devices"
  | "report"
  | "feedback"
  | "kiosk-sales"
  | "users"
  | "companies"
  | "company-users"
  | "admin-users"
  | "paid-orders"
  | "payouts"
  | "accounts";

interface Props {
  activePage: Page;
  setActivePage: (page: Page) => void;
  // ❌ Remove these:
  // orders: Order[];
  // lifetimeRevenue: number;
  // lifetimeReferralFees: number;
  locations: Location[];
  locationsLoading: boolean;
  selectedLocation: Location | null;
  selectedKiosk: string | null;
  setSelectedKiosk: (kioskId: string) => void;
  currentUser: Partner;
  onSelectLocation: (location: Location) => void;
  onBackToLocations: () => void;
}

const AppRoutes: React.FC<Props> = ({
  activePage,
  setActivePage,
  locations,
  locationsLoading,
  selectedLocation,
  selectedKiosk,
  setSelectedKiosk,
  currentUser,
  onSelectLocation,
  onBackToLocations,
}) => {
  switch (activePage) {
    case "dashboard":
      return (
        <Dashboard
          currentUser={currentUser}  // ✅ Only this prop now
        />
      );

    case "locations":
      return <Locations locations={locations} loading={locationsLoading} onSelectLocation={onSelectLocation} />;

    case "devices":
      return selectedLocation ? (
        <Devices
          locationId={selectedLocation.location_id}
          locationName={selectedLocation.location_name}
          onBack={onBackToLocations}
          onSelectKiosk={(kioskId) => {
            setSelectedKiosk(kioskId);
            setActivePage("kiosk-sales");
          }}
          selectedKiosk={selectedKiosk}
        />
      ) : null;

    case "kiosk-sales":
      return selectedKiosk ? (
        <KioskSales
          kioskId={selectedKiosk}
          locationName={selectedLocation?.location_name || "Unknown"}
          onBack={() => setActivePage("devices")}
        />
      ) : null;

    case "feedback":
      return <Feedback partner={currentUser} />;

    case "users":
    case "company-users":
      return currentUser.isSuperAdmin || currentUser.companyRole === "company super admin" ? (
        <CompanyUsers />
      ) : (
        <div className="text-red-400">Access denied. Company Admins only.</div>
      );

    case "admin-users":
      // Only super admins can see admin users
      return currentUser.isSuperAdmin ? (
        <AdminUsers />
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );

    case "companies":
      // Only super admins can access companies page
      return currentUser.isSuperAdmin ? (
        <Companies />
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );

    case "paid-orders":
      return currentUser.isSuperAdmin ? (
        <div className="text-white">Paid Orders Page - Coming Soon</div>
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );

    case "payouts":
      return currentUser.isSuperAdmin ? (
        <Payouts />
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );

    case "accounts":
      return currentUser.isSuperAdmin ? (
        <Accounts />
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );

    default:
      return null;
  }
};

export default AppRoutes;