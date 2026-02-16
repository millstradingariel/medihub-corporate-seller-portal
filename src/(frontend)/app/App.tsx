import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Logo from "../components/Logo";
import PasswordChangeModal from "../components/PasswordChangeModal";
import AppRoutes from "./AppRoutes";
import { Loader2, Menu, LogIn, X } from "lucide-react";
import { Partner, Location, Order, Company } from "../../../types";
import supabase from "../../../supabase";
import { AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export type Page =
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

const App: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Partner | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const [viewAsCompany, setViewAsCompany] = useState<Company | null>(null);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  const effectiveUser: Partner | null = viewAsCompany && currentUser
    ? {
      ...currentUser,
      companyId: viewAsCompany.company_id,
      companyName: viewAsCompany.company_name,
      isSuperAdmin: false,
      roleType: 'company',
      companyRole: 'company_super_admin',
    }
    : currentUser;

  /* ========================= NAV ========================= */
  const [activePage, setActivePage] = useState<Page>(() => {
    return (localStorage.getItem("activePage") as Page) || "dashboard";
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /* ========================= DASHBOARD ========================= */
  const [orders, setOrders] = useState<Order[]>([]);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [lifetimeReferralFees, setLifetimeReferralFees] = useState(0);

  /* ========================= LOCATIONS ========================= */
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [selectedKiosk, setSelectedKiosk] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setToken(null);
    setViewAsCompany(null);
    localStorage.removeItem("supabaseToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("viewAsCompany");
  };

  const fetchUserByEmail = async (email: string): Promise<Partner | null> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/by-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("❌ Fetch user exception:", err);
      return null;
    }
  };

  const verifySession = async (email: string): Promise<Partner | null> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-session?email=${encodeURIComponent(email)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      return null;
    }
  };

  const syncWholesaleOrders = async (userToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/wholesale-orders/sync`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const json = await res.json();
      console.log(`✅ Synced: ${json.count} orders`);
    } catch (err) {
      console.error('❌ Sync error:', err);
    }
  };

  const syncCompanies = async (userToken: string) => {
    try {
      await fetch(`${API_URL}/api/company/sync`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
    } catch (err) {
      console.error('❌ Sync companies error:', err);
    }
  };

  const syncLocations = async (userToken: string) => {
    try {
      await fetch(`${API_URL}/api/sync-company-locations-test`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
    } catch (err) {
      console.error('❌ Sync locations error:', err);
    }
  };

  const syncDevices = async (userToken: string) => {
    try {
      await fetch(`${API_URL}/api/sync-devices`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
    } catch (err) {
      console.error('❌ Sync devices error:', err);
    }
  };

  const syncLocationDevices = async (userToken: string) => {
    try {
      await fetch(`${API_URL}/api/sync-location-devices`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
    } catch (err) {
      console.error('❌ Sync location devices error:', err);
    }
  };

  useEffect(() => {
    const savedViewAs = localStorage.getItem('viewAsCompany');
    if (savedViewAs) {
      try {
        setViewAsCompany(JSON.parse(savedViewAs));
      } catch {
        localStorage.removeItem('viewAsCompany');
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user?.email) {
        setCurrentUser(null);
        setToken(null);
        setRequiresPasswordChange(false);
        localStorage.removeItem("supabaseToken");
        localStorage.removeItem("currentUser");
        setAuthLoading(false);
        return;
      }

      try {
        const accessToken = session.access_token;
        setToken(accessToken);
        localStorage.setItem("supabaseToken", accessToken);

        const user = await verifySession(session.user.email);
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("currentUser", JSON.stringify(user));
          if (user.is_active === 2) setRequiresPasswordChange(true);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user?.email) {
        setCurrentUser(null);
        setToken(null);
        setRequiresPasswordChange(false);
        localStorage.removeItem("supabaseToken");
        localStorage.removeItem("currentUser");
        return;
      }

      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        setSessionExpired(true); // ✅ show modal
        return;
      }

      try {
        const accessToken = session.access_token;
        setToken(accessToken);
        localStorage.setItem("supabaseToken", accessToken);

        const user = await verifySession(session.user.email);
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("currentUser", JSON.stringify(user));
          if (user.is_active === 2) setRequiresPasswordChange(true);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedViewAs = localStorage.getItem('viewAsCompany');
    if (savedViewAs) {
      try {
        setViewAsCompany(JSON.parse(savedViewAs));
      } catch {
        localStorage.removeItem('viewAsCompany');
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    });

    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (viewAsCompany) {
      localStorage.setItem('viewAsCompany', JSON.stringify(viewAsCompany));
    } else {
      localStorage.removeItem('viewAsCompany');
    }
  }, [viewAsCompany]);

  const handlePasswordChanged = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setToken(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('supabaseToken');
    localStorage.removeItem('currentUser');
    setPassword(''); // ✅ just clear password, keep email
  };

  useEffect(() => {
    localStorage.setItem("activePage", activePage);
  }, [activePage]);

  useEffect(() => {
    const companyId = effectiveUser?.companyId;
    if (!companyId || !token) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/dashboard/seller?companyId=${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        setOrders(json.orders || []);
        setLifetimeRevenue(json.lifetimeRevenue || 0);
        setLifetimeReferralFees(json.lifetimeReferralFees || 0);
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    const fetchCompanyLocations = async () => {
      try {
        setLocationsLoading(true);
        const res = await fetch(`${API_URL}/api/locations?companyId=${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setLocations(json.data || []);
      } catch (err) {
        console.error('❌ Fetch locations error:', err);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchCompanyLocations();
    fetchDashboard();
  }, [effectiveUser?.companyId, token]); // ✅ re-fetches when viewAs changes

  useEffect(() => {
    const initialize = async () => {
      if (!currentUser?.companyId || !token) return;
      await syncCompanies(token);
      await syncLocations(token);
      await syncDevices(token);
      await syncLocationDevices(token);
      await syncWholesaleOrders(token);
    };
    initialize();
  }, [currentUser?.companyId, token]);

  /* ========================= VIEW AS HANDLER ========================= */
  const handleViewAs = (company: Company) => {
    setViewAsCompany(company);
    setSelectedLocation(null);
    setSelectedKiosk(null);
    setActivePage("dashboard"); // ✅ switch to dashboard after selecting company
  };

  const handleExitViewAs = () => {
    setViewAsCompany(null);
    setSelectedLocation(null);
    setSelectedKiosk(null);
    setActivePage("companies"); // ✅ go back to companies list
  };

  /* ========================= NAV HANDLERS ========================= */
  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    setActivePage("devices");
  };

  const handleBackToLocations = () => {
    setSelectedLocation(null);
    setSelectedKiosk(null);
    setActivePage("locations");
  };

  /* ========================= AUTH LOADING GUARD ========================= */
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  /* ========================= LOGIN ========================= */
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
          <Logo className="h-12 mx-auto mb-6" />
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError(null);
              try {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw new Error(signInError.message);
                const accessToken = data.session?.access_token;
                if (!accessToken) throw new Error("No session token received");
                setToken(accessToken);
                localStorage.setItem("supabaseToken", accessToken);
                const user = await fetchUserByEmail(data.user?.email!);
                if (!user) throw new Error("No account linked to this email");
                setCurrentUser(user);
                localStorage.setItem("currentUser", JSON.stringify(user));
              } catch (err: any) {
                setAuthError(err.message || "Login failed");
              }
            }}
          >
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-white" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-white" required />
            {authError && <div className="text-red-400 text-sm">{authError}</div>}
            <button className="w-full p-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200">Login</button>
          </form>
        </div>
      </div>
    );
  }

  /* ========================= PASSWORD CHANGE REQUIRED ========================= */
  if (requiresPasswordChange && currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <PasswordChangeModal email={currentUser.email} onPasswordChanged={handlePasswordChanged} />
      </div>
    );
  }


  /* ========================= APP ========================= */
  return (

    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {
        sessionExpired && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <AlertTriangle size={24} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Session Expired</h2>
                  <p className="text-zinc-400 text-sm">Your session has expired due to inactivity.</p>
                </div>
              </div>

              <p className="text-zinc-300 text-sm">
                Would you like to continue where you left off, or sign out?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    // ✅ Try to refresh session
                    const { data, error } = await supabase.auth.refreshSession();
                    if (data.session) {
                      setSessionExpired(false);
                      localStorage.setItem('supabaseToken', data.session.access_token);
                    } else {
                      // Refresh failed, force logout
                      handleLogout();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Continue Session
                </button>
                <button
                  onClick={() => {
                    setSessionExpired(false);
                    handleLogout();
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )
      }
      <Sidebar
        activePage={activePage}
        onNavigate={(page: Page) => {
          if (page !== "devices" && page !== "kiosk-sales") setSelectedLocation(null);
          if (page !== "kiosk-sales") setSelectedKiosk(null);
          setActivePage(page);
        }}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        currentUser={effectiveUser} // ✅ use effectiveUser so sidebar reflects viewed company
        viewAsCompany={viewAsCompany} // ✅ add this
        handleExitViewAs={handleExitViewAs} // ✅ add this
        originalUser={currentUser} // ✅ the real user, not effectiveUser

      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <AppRoutes
              activePage={activePage}
              setActivePage={setActivePage}
              locations={locations}
              locationsLoading={locationsLoading}
              selectedLocation={selectedLocation}
              selectedKiosk={selectedKiosk}
              setSelectedKiosk={setSelectedKiosk}
              currentUser={effectiveUser}
              onSelectLocation={handleSelectLocation}
              onBackToLocations={handleBackToLocations}
              onViewAs={handleViewAs}
              originalUser={currentUser}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;