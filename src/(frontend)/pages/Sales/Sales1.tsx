// import React, { useState, useMemo } from 'react';
// import { Order, Location } from '../../../../types';
// import { formatCurrency, formatDate } from '../../../backend/services/dataService';
// import { Search, Filter, MapPin, X, ChevronRight } from 'lucide-react';

// interface SalesProps {
//   orders: Order[];
//   locations: Location[];
// }

// const Sales: React.FC<SalesProps> = ({ orders, locations }) => {
//   const [activeTab, setActiveTab] = useState<'locations' | 'orders'>('locations');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [locationFilter, setLocationFilter] = useState<string>('all');
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

//   // Data for Location Breakdown
//   const locationStats = useMemo(() => {
//     return locations.map(loc => {
//       const locOrders = orders.filter(o => o.location_id === loc.location_id);
//       const allTime = locOrders.reduce((acc, curr) => acc + curr.total_ex_gst, 0);
      
//       const now = new Date();
//       const monthly = locOrders
//         .filter(o => new Date(o.order_date).getMonth() === now.getMonth() && new Date(o.order_date).getFullYear() === now.getFullYear())
//         .reduce((acc, curr) => acc + curr.total_ex_gst, 0);
        
//       const weekly = locOrders
//         .filter(o => {
//            const d = new Date(o.order_date);
//            const diffTime = Math.abs(now.getTime() - d.getTime());
//            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
//            return diffDays <= 7;
//         })
//         .reduce((acc, curr) => acc + curr.total_ex_gst, 0);

//       return {
//         ...loc,
//         allTime,
//         monthly,
//         weekly
//       };
//     });
//   }, [locations, orders]);

//   // Data for Order List
//   const filteredOrders = useMemo(() => {
//     return orders.filter(order => {
//       const matchesSearch = order.order_id.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesLoc = locationFilter === 'all' || order.location_id === locationFilter;
//       return matchesSearch && matchesLoc;
//     });
//   }, [orders, searchTerm, locationFilter]);

//   const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.location_name || 'Unknown';

//   return (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-bold text-white">Sales Overview</h2>
//           <p className="text-zinc-400">Manage orders and track revenue.</p>
//         </div>
        
//         {/* Tabs */}
//         <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg self-start sm:self-auto">
//           <button 
//             onClick={() => setActiveTab('locations')}
//             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'locations' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
//           >
//             By Location
//           </button>
//           <button 
//             onClick={() => setActiveTab('orders')}
//             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'orders' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
//           >
//             Order List
//           </button>
//         </div>
//       </div>

//       {activeTab === 'locations' && (
//         <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm text-left">
//               <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
//                 <tr>
//                   <th className="px-6 py-4">Location Name</th>
//                   <th className="px-6 py-4 text-right">Weekly Sales</th>
//                   <th className="px-6 py-4 text-right">Monthly Sales</th>
//                   <th className="px-6 py-4 text-right">All-time Sales</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-zinc-800">
//                 {locationStats.map(loc => (
//                   <tr key={loc.location_id} className="hover:bg-zinc-800/50 transition-colors">
//                     <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
//                       <MapPin size={16} className="text-zinc-400" />
//                       {loc.location_name}
//                     </td>
//                     <td className="px-6 py-4 text-right text-zinc-400">{formatCurrency(loc.weekly)}</td>
//                     <td className="px-6 py-4 text-right text-zinc-400">{formatCurrency(loc.monthly)}</td>
//                     <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(loc.allTime)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {activeTab === 'orders' && (
//         <div className="space-y-4">
//           {/* Filters */}
//           <div className="flex flex-col sm:flex-row gap-4">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
//               <input 
//                 type="text" 
//                 placeholder="Search Order ID..." 
//                 className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="relative w-full sm:w-64">
//               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
//               <select 
//                 className="w-full pl-10 pr-8 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-white appearance-none"
//                 value={locationFilter}
//                 onChange={(e) => setLocationFilter(e.target.value)}
//               >
//                 <option value="all">All Locations</option>
//                 {locations.map(l => (
//                   <option key={l.location_id} value={l.location_id}>{l.location_name}</option>
//                 ))}
//               </select>
//             </div>
//           </div>

//           {/* Orders Table */}
//           <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm text-left">
//                 <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
//                   <tr>
//                     <th className="px-6 py-4">Order Date</th>
//                     <th className="px-6 py-4">Order ID</th>
//                     <th className="px-6 py-4">Location</th>
//                     <th className="px-6 py-4 text-right">Revenue (ex GST)</th>
//                     <th className="px-6 py-4 text-right">Commission</th>
//                     <th className="px-6 py-4">Status</th>
//                     <th className="px-6 py-4"></th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-zinc-800">
//                   {filteredOrders.length > 0 ? (
//                     filteredOrders.map(order => (
//                       <tr 
//                         key={order.order_id} 
//                         className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
//                         onClick={() => setSelectedOrder(order)}
//                       >
//                         <td className="px-6 py-4 text-zinc-400">{formatDate(order.order_date)}</td>
//                         <td className="px-6 py-4 font-medium text-white">{order.order_id}</td>
//                         <td className="px-6 py-4 text-zinc-400">{getLocationName(order.location_id)}</td>
//                         <td className="px-6 py-4 text-right text-white">{formatCurrency(order.total_ex_gst)}</td>
//                         <td className="px-6 py-4 text-right text-zinc-200 font-medium">{formatCurrency(order.commission_amount)}</td>
//                         <td className="px-6 py-4">
//                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
//                             ${order.status === 'Paid' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 
//                               order.status === 'Pending' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
//                               order.status === 'Returned' ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-blue-900/20 text-blue-400 border-blue-900/50'
//                             }`}>
//                             {order.status}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 text-zinc-600">
//                           <ChevronRight size={16} />
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No orders found matching your filters.</td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Order Detail Modal */}
//       {selectedOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
//           <div className="bg-zinc-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200 border border-zinc-800">
//             <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
//               <h3 className="text-lg font-bold text-white">Order Details</h3>
//               <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-white">
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs text-zinc-500 uppercase tracking-wider">Order ID</label>
//                   <p className="font-medium text-white">{selectedOrder.order_id}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs text-zinc-500 uppercase tracking-wider">Date</label>
//                   <p className="font-medium text-white">{formatDate(selectedOrder.order_date)}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs text-zinc-500 uppercase tracking-wider">Location</label>
//                   <p className="font-medium text-white">{getLocationName(selectedOrder.location_id)}</p>
//                 </div>
//                 <div>
//                   <label className="text-xs text-zinc-500 uppercase tracking-wider">Status</label>
//                   <p className="font-medium text-white">{selectedOrder.status}</p>
//                 </div>
//               </div>
//               <div className="pt-4 border-t border-zinc-800">
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-zinc-400">Revenue (ex GST)</span>
//                   <span className="font-medium text-white">{formatCurrency(selectedOrder.total_ex_gst)}</span>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <span className="text-zinc-400">Commission (10%)</span>
//                   <span className="font-bold text-white">{formatCurrency(selectedOrder.commission_amount)}</span>
//                 </div>
//               </div>
//             </div>
//             <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-right">
//               <button 
//                 onClick={() => setSelectedOrder(null)}
//                 className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 font-medium text-sm transition-colors"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Sales;