import React, { useState, useEffect } from "react";
import Sidebar from "../frontend/components/Sidebar";
import Logo from "../frontend/components/Logo";
import PasswordChangeModal from "../frontend/components/PasswordChangeModal";

import { Loader2 } from "lucide-react";
import { Partner, Location, Order } from "../../types";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../frontend/firebase/firebase.client";
import AppRoutes from "./AppRoutes";

const API_URL = process.env.REACT_APP_API_URL;

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
  | "company-users"
  | "admin-users"
  | "paid-orders"
  | "payouts"
  | "accounts";

const App: React.FC = () => {
  /* ========================= AUTH ========================= */
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Partner | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  /* ========================= NAV ========================= */
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /* ========================= DASHBOARD ========================= */
  const [orders, setOrders] = useState<Order[]>([]);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [lifetimeReferralFees, setLifetimeReferralFees] = useState(0);

  /* ========================= LOCATIONS ========================= */
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  /* ========================= KIOSK ========================= */
  const [selectedKiosk, setSelectedKiosk] = useState<string | null>(null);

  /* ========================= UI ========================= */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ========================= LOGIN FORM ========================= */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  /* ========================= HELPER: Fetch user by email (NO AUTH REQUIRED) ========================= */
  const fetchUserByEmail = async (email: string): Promise<Partner | null> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/by-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Fetch user error:", errorData);
        return null;
      }
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("Fetch user exception:", err);
      return null;
    }
  };

  /* ========================= RESTORE SESSION ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser?.email) {
        setCurrentUser(null);
        setToken(null);
        setRequiresPasswordChange(false);
        localStorage.removeItem("firebaseToken");
        localStorage.removeItem("currentUser");
        setAuthLoading(false);
        return;
      }

      try {
        // Get fresh token
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        localStorage.setItem("firebaseToken", idToken);

        // Fetch user data (no auth header needed for /by-email)
        const user = await fetchUserByEmail(firebaseUser.email);
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("currentUser", JSON.stringify(user));

          // Check if user needs to change password
          if (!user.is_active) {
            setRequiresPasswordChange(true);
          }
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ========================= PASSWORD CHANGE HANDLER ========================= */
  const handlePasswordChanged = async () => {
    // Refresh user data to get updated is_active status
    if (currentUser?.email) {
      const updatedUser = await fetchUserByEmail(currentUser.email);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        setRequiresPasswordChange(false);
      }
    }
  };
  /* ========================= DASHBOARD DATA ========================= */
  useEffect(() => {
    if (!currentUser?.companyId || !token) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/dashboard?companyId=${currentUser.companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

    fetchDashboard();
    setActivePage("dashboard");
  }, [currentUser, token]);

  /* ========================= LOCATIONS ========================= */
  useEffect(() => {
    if (!currentUser?.companyId || !token) return;

    const fetchLocations = async () => {
      try {
        setLocationsLoading(true);
        const res = await fetch(`${API_URL}/api/locations?companyId=${currentUser.companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        setLocations(json.data || []);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, [currentUser, token]);

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
                const cred = await signInWithEmailAndPassword(auth, email, password);

                // Get Firebase token
                const idToken = await cred.user.getIdToken();
                setToken(idToken);
                localStorage.setItem("firebaseToken", idToken);

                const user = await fetchUserByEmail(cred.user.email!);
                if (!user) throw new Error("No account linked to this email");

                setCurrentUser(user);
                localStorage.setItem("currentUser", JSON.stringify(user));
              } catch (err: any) {
                setAuthError(err.message || "Login failed");
              }
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-white"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 rounded bg-zinc-950 border border-zinc-800 text-white"
              required
            />

            {authError && <div className="text-red-400 text-sm">{authError}</div>}

            <button className="w-full p-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }
  /* ========================= PASSWORD CHANGE REQUIRED ========================= */
  if (requiresPasswordChange && currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <PasswordChangeModal
          email={currentUser.email}
          onPasswordChanged={handlePasswordChanged}
        />
      </div>
    );
  }
  /* ========================= APP ========================= */
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar
        activePage={activePage}
        onNavigate={(page: Page) => {
          if (page !== "devices" && page !== "kiosk-sales") setSelectedLocation(null);
          if (page !== "kiosk-sales") setSelectedKiosk(null);
          setActivePage(page);
        }}
        onLogout={() => {
          auth.signOut();
          setCurrentUser(null);
          setToken(null);
          localStorage.removeItem("firebaseToken");
          localStorage.removeItem("currentUser");
        }}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        partnerName={currentUser.companyName || currentUser.email || ""}
        currentUser={currentUser}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <AppRoutes
            activePage={activePage}
            setActivePage={setActivePage}
            orders={orders}
            lifetimeRevenue={lifetimeRevenue}
            lifetimeReferralFees={lifetimeReferralFees}
            locations={locations}
            locationsLoading={locationsLoading}
            selectedLocation={selectedLocation}
            selectedKiosk={selectedKiosk}
            setSelectedKiosk={setSelectedKiosk}
            currentUser={currentUser}
            onSelectLocation={handleSelectLocation}
            onBackToLocations={handleBackToLocations}
          />
        )}
      </div>
    </div>
  );
};

export default App;
