// frontend/src/pages/auth/Login.tsx
import { useState } from "react";
import supabase from "../../../../supabase"; // ✅ your supabase.ts client
import Logo from "../../components/Logo";

interface BackendUser {
  id: number;
  email: string;
  name: string | null;
  supabaseUid: string;        // ✅ was firebaseUid
  is_active: boolean;
  isSuperAdmin: boolean;
  
  // Corporate user fields
  superAdminRole?: string;
  superAdminRoleDisplay?: string;
  
  // Company user fields
  companyId?: number;
  companyName?: string;
  companyRole?: string;
  companyRoleDisplay?: string;
  
  // Common fields
  roleId: number;
  roleType: 'corporate' | 'company';
}

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw new Error(signInError.message);

      // 2️⃣ Get Supabase access token
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("No session token received");

      // 3️⃣ Fetch user details from backend
      const res = await fetch(`${API_URL}/api/auth/by-email?email=${encodeURIComponent(email)}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch user data");
      }

      const { data: user }: { data: BackendUser } = await res.json();

      // Check if user is active
      if (!user.is_active) {
        throw new Error("Your account is inactive. Please contact support.");
      }

      // 4️⃣ Store user info AND token in local storage
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("supabaseToken", accessToken); // ✅ was firebaseToken

      // 5️⃣ Redirect based on role_type
      if (user.roleType === 'corporate') {
        window.location.href = "/companies";
      } else if (user.roleType === 'company') {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/";
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm bg-zinc-900 p-6 rounded-xl shadow-md">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-white"
          required
        />

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-white"
          required
        />

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}