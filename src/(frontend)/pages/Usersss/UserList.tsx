// import React, { useEffect, useState } from "react";
// import { Partner } from "../../../../types";

// interface User {
//   id: number;
//   email: string;
//   role: "Admin" | "Manager" | "Viewer";
//   company_name: string;
// }

// interface Props {
//   currentUser: Partner;
// }

// const API_URL = "http://localhost:3001";

// const UserList: React.FC<Props> = ({ currentUser }) => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const fetchUsers = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       // Get token from localStorage
//       const token = localStorage.getItem("firebaseToken");
//       if (!token) throw new Error("Not authenticated");

//       const res = await fetch(`${API_URL}/api/users`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (!res.ok) {
//         const text = await res.text();
//         throw new Error(`Error ${res.status}: ${text}`);
//       }

//       const json = await res.json();
//       setUsers(json.data || []);
//     } catch (err: any) {
//       console.error("Fetch users failed:", err);
//       setError(err.message || "Failed to load users");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (currentUser?.company_id) fetchUsers();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [currentUser.company_id]);

//   if (loading) return <div className="text-zinc-400 animate-pulse">Loading users…</div>;
//   if (error) return <div className="text-red-400">{error}</div>;

//   if (currentUser.role !== "Admin" && !currentUser.isSuperAdmin) {
//     return (
//       <div className="space-y-4">
//         <h2 className="text-2xl font-bold text-white">Users</h2>
//         <p className="text-zinc-500 text-sm">Only Admins can manage users.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       <h2 className="text-2xl font-bold text-white">Users</h2>
//       <table className="w-full text-left border border-zinc-800 rounded-lg overflow-hidden">
//         <thead className="bg-zinc-900 text-zinc-400">
//           <tr>
//             <th className="p-3">Company</th>
//             <th className="p-3">Email</th>
//             <th className="p-3">Role</th>
//           </tr>
//         </thead>
//         <tbody className="bg-zinc-950 divide-y divide-zinc-800">
//           {users.map((u) => (
//             <tr key={u.id} className="hover:bg-zinc-900">
//               <td className="p-3">{u.company_name}</td>
//               <td className="p-3">{u.email}</td>
//               <td className="p-3">{u.role}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {users.length === 0 && (
//         <p className="text-zinc-500 text-sm">No users found.</p>
//       )}
//     </div>
//   );
// };

// export default UserList;
