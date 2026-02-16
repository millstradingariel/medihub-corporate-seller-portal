import React from "react";
import Dashboard from "../pages/Dashboard/Dashboard";
import CorporateDashboard from "../pages/Dashboard/CorporateDashboard";
import Sales from "../pages/Sales/Sales";
import KioskSales from "../pages/KioskSales/KioskSales";
import Locations from "../pages/Locations/Locations";
import Devices from "../pages/Devices/Devices";
import Feedback from "../pages/Feedback/Feedback";
import Companies from "../pages/Company/Company";
import Accounts from "../pages/Finance/Accounts";
import Payouts from "../pages/Finance/Payouts";
import { Partner, Location, Company } from "../../../types";
import SellerUsers from "../pages/Users/Seller";
import CorporateUsers from "../pages/Users/Corporate";
import Orders from "../pages/Order/Order";
import ViewOrders from "../pages/Order/ViewOrder";
import OrdersHistory from "../pages/Order/OrderHistory";
import Roles from "../pages/Roles/Roles"
import AuditLogs from "../pages/AuditLogs/AuditLogs"

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
  | "seller-users"
  | "corporate-users"
  | "paid-orders"
  | "payouts"
  | "create-orders"
  | "view-orders"
  | "orders-history"
  | "accounts"
  | "audit-logs"
  | "roles";

interface Props {
  activePage: Page;
  setActivePage: (page: Page) => void;
  locations: Location[];
  locationsLoading: boolean;
  selectedLocation: Location | null;
  selectedKiosk: string | null;
  setSelectedKiosk: (kioskId: string) => void;
  currentUser: Partner;
  onSelectLocation: (location: Location) => void;
  onBackToLocations: () => void;
  onViewAs: (company: Company) => void; // ✅ add this
  originalUser: Partner | null; // ✅ always the real logged-in user
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
  onViewAs,
  originalUser,
}) => {
  // ✅ DEBUG: Log the selected location
  if (activePage === "devices" && selectedLocation) {
    console.log('📍 Devices case - selectedLocation:', {
      _id: selectedLocation._id,
      location_id: selectedLocation.location_id,
      location_name: selectedLocation.location_name
    });
  }

  switch (activePage) {
    case "dashboard":
      // ✅ If super admin is viewing as a company, show company Dashboard
      if (originalUser?.roleType === 'corporate' && currentUser?.roleType === 'company') {
        return <Dashboard currentUser={currentUser} />;
      }
      // ✅ Otherwise show based on actual role
      return originalUser?.roleType === 'corporate' ? (
        <CorporateDashboard currentUser={currentUser} />
      ) : (
        <Dashboard currentUser={currentUser} />
      );
    case "locations":
      return <Locations locations={locations} loading={locationsLoading} onSelectLocation={onSelectLocation} />;
    case "devices":
      return selectedLocation ? (
        <Devices
          locationId={selectedLocation._id}
          locationName={selectedLocation.location_name}
          onBack={onBackToLocations}
          onSelectKiosk={(kioskId) => {
            console.log('🎮 Kiosk selected:', kioskId);
            setSelectedKiosk(kioskId);
            setActivePage("kiosk-sales");
          }}
          selectedKiosk={selectedKiosk}
        />
      ) : (
        <div className="text-yellow-400">
          ⚠️ No location selected. Please select a location from the Locations page.
        </div>
      );
    case "kiosk-sales":
      return selectedKiosk ? (
        <KioskSales
          kioskId={selectedKiosk}
          locationName={selectedLocation?.location_name || "Unknown"}
          onBack={() => setActivePage("devices")}
        />
      ) : (
        <div className="text-yellow-400">
          ⚠️ No kiosk selected. Please select a device from the Devices page.
        </div>
      );
    case "feedback":
      return <Feedback partner={currentUser} />;
    case "seller-users":
      return originalUser?.roleType === 'corporate' ||
        currentUser?.companyRole === 'company_super_admin' ||
        currentUser?.companyRole === 'company_admin' ? (
        <SellerUsers currentUser={currentUser} />
      ) : (
        <div className="text-red-400">Access denied. Admins only.</div>
      )
    case "corporate-users":
      return originalUser?.roleType === 'corporate' &&
        originalUser?.superAdminRole === 'super_admin' ? (
        <CorporateUsers />
      ) : (
        <div className="text-red-400">Access denied. Super Admins only.</div>
      );
    case "companies":
      return originalUser?.roleType === 'corporate' ? (
        <Companies onViewAs={onViewAs} />
      ) : (
        <div className="text-red-400">Access denied. Corporate users only.</div>
      );
    case "paid-orders":
      return originalUser?.roleType === 'corporate' ? (
        <div className="text-white">Paid Orders Page - Coming Soon</div>
      ) : (
        <div className="text-red-400">Access denied. Corporate users only.</div>
      );
    case "payouts":
      return originalUser?.roleType === 'corporate' ? (
        <Payouts />
      ) : (
        <div className="text-red-400">Access denied. Corporate users only.</div>
      );
    case "accounts":
      return originalUser?.roleType === 'corporate' ? (
        <Accounts />
      ) : (
        <div className="text-red-400">Access denied. Corporate users only.</div>
      );
    case "roles":
      return originalUser?.roleType === 'corporate' ? (
        <Roles />
      ) : (
        <div className="text-red-400">Access denied. Corporate users only.</div>
      );
    case "create-orders":
      return <Orders currentUser={currentUser} />;

    case "view-orders":
      return <ViewOrders currentUser={currentUser} />;

    case "orders-history":
      return <OrdersHistory currentUser={currentUser} />;

    case "audit-logs":
      return <AuditLogs currentUser={currentUser} />;

    default:
      return null;
  }
};

export default AppRoutes;