// frontend/src/pages/auth/Login.tsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase.client";
import Logo from "../../components/Logo";

interface BackendUser {
  id: number;
  email: string;
  isSuperAdmin: boolean;
  companyId: number | null;
  companyName: string | null;
  role: string | null;
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
      // 1️⃣ Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 2️⃣ Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // 3️⃣ Fetch user details from backend (NO AUTH HEADER for this endpoint)
      const res = await fetch(`${API_URL}/api/auth/by-email?email=${encodeURIComponent(email)}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch user data");
      }

      const { data: user }: { data: BackendUser } = await res.json();

      // 4️⃣ Store user info AND token in local storage
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("firebaseToken", idToken);

      // 5️⃣ Redirect based on role
      if (user.isSuperAdmin) {
        window.location.href = "/companies"; // super admin page
      } else if (user.role === "company_admin") {
        window.location.href = "/dashboard"; // company admin dashboard
      } else {
        window.location.href = "/"; // fallback for staff/viewer
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm bg-zinc-900 p-6 rounded-xl shadow-md">
        <div className="flex justify-center mb-4">
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

        {error && <div className="text-red-400 text-sm">{error}</div>}

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
