import React, { useEffect, useState } from "react";
import { Cpu, ArrowLeft, Loader2, Search, MonitorSmartphone, Hash } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export interface Device {
  _id: string;
  deviceId: string;
  model: string;
  internalId: string;
  deviceType: string[];
}

interface DevicesProps {
  locationId: string;
  locationName: string;
  onBack: () => void;
  onSelectKiosk: (kioskId: string) => void;
  selectedKiosk: string | null;
}

const Devices: React.FC<DevicesProps> = ({
  locationId,
  locationName,
  onBack,
  onSelectKiosk,
  selectedKiosk,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;

    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('supabaseToken');
        const res = await fetch(`${API_URL}/api/device/devices?locationId=${locationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        setDevices(json.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch devices:', err);
        setError("Failed to load devices");
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [locationId]);

  const filtered = devices.filter((d) =>
    d.deviceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.internalId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-32 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-12 w-full bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
          <Cpu className="text-zinc-600" size={28} />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Failed to load devices</p>
          <p className="text-zinc-500 text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
              {locationName}
            </p>
            <h2 className="text-3xl font-bold text-white">Devices</h2>
            <p className="text-zinc-400 mt-1 text-sm">
              {devices.length} {devices.length === 1 ? 'device' : 'devices'} available
            </p>
          </div>
        </div>
        {/* Live dot indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Active</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!devices.length && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <Cpu className="text-zinc-600" size={28} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">No devices found</p>
            <p className="text-zinc-500 text-sm mt-1">No devices are linked to this location yet.</p>
          </div>
        </div>
      )}

      {/* No search results */}
      {filtered.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Search className="text-zinc-700" size={32} />
          <p className="text-zinc-400 text-sm">No devices match <span className="text-white">"{searchQuery}"</span></p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className={`grid gap-5 ${filtered.length === 1
            ? 'grid-cols-1 max-w-sm'
            : filtered.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-2xl'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
          {filtered.map((device, index) => {
            const isHovered = hoveredId === device._id;
            const isSelected = selectedKiosk === device.internalId;

            return (
              <button
                key={device._id}
                onClick={() => onSelectKiosk(device.internalId)}
                onMouseEnter={() => setHoveredId(device._id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
                    : isHovered
                      ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
                      : '#18181b',
                  borderColor: isSelected
                    ? 'rgb(99 102 241 / 0.8)'
                    : isHovered
                      ? 'rgb(99 102 241 / 0.5)'
                      : 'rgb(39 39 42)',
                  boxShadow: isSelected
                    ? '0 0 30px rgb(99 102 241 / 0.2)'
                    : isHovered
                      ? '0 0 30px rgb(99 102 241 / 0.1)'
                      : 'none',
                  animationDelay: `${index * 60}ms`,
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300"
                  style={{
                    background: isSelected || isHovered
                      ? 'linear-gradient(90deg, transparent, rgb(99 102 241), transparent)'
                      : 'transparent',
                  }}
                />

                <div className="p-6">
                  {/* Icon + Selected badge row */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isSelected || isHovered
                          ? 'linear-gradient(135deg, rgb(99 102 241 / 0.3), rgb(129 140 248 / 0.2))'
                          : 'rgb(39 39 42)',
                      }}
                    >
                      <Cpu
                        size={22}
                        className="transition-colors duration-300"
                        style={{ color: isSelected || isHovered ? 'rgb(129 140 248)' : 'rgb(113 113 122)' }}
                      />
                    </div>
                    {isSelected && (
                      <span className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-medium rounded-lg">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Device ID */}
                  <h3
                    className="text-lg font-bold mb-1 transition-colors duration-300 leading-tight"
                    style={{ color: isSelected || isHovered ? 'white' : 'rgb(228 228 231)' }}
                  >
                    {device.deviceId}
                  </h3>
                  <p className="text-zinc-500 text-sm">{device.model || 'Unknown model'}</p>

                  {/* Divider */}
                  <div
                    className="my-4 h-px transition-colors duration-300"
                    style={{ background: isSelected || isHovered ? 'rgb(99 102 241 / 0.2)' : 'rgb(39 39 42)' }}
                  />

                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-3">
                    <Hash size={13} className="text-zinc-600 flex-shrink-0" />
                    <span className="text-zinc-500 text-xs font-mono">{device.internalId}</span>
                  </div>

                  {/* Device types */}
                  {device.deviceType?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {device.deviceType.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors duration-300"
                          style={{
                            background: isSelected || isHovered ? 'rgb(99 102 241 / 0.15)' : 'rgb(39 39 42)',
                            color: isSelected || isHovered ? 'rgb(165 180 252)' : 'rgb(113 113 122)',
                          }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom glow */}
                {(isHovered || isSelected) && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse, rgb(99 102 241 / 0.15) 0%, transparent 70%)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Devices;