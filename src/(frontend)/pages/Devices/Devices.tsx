import React, { useEffect, useState } from "react";
import { Cpu, ArrowLeft, Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!locationId) {
      console.log('⚠️ No locationId provided');
      return;
    }

    const fetchDevices = async () => {
      try {
        console.log('📱 Fetching devices for location:', locationId);
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('firebaseToken');
        const url = `${API_URL}/api/devices?locationId=${locationId}`;
        console.log('🔗 Fetching from:', url);

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Response status:', res.status);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        console.log('📦 Devices response:', json);
        console.log('📊 Number of devices:', json.data?.length || 0);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Devices</h2>
          <p className="text-zinc-400">{locationName}</p>
        </div>
      </div>

      {/* Empty state */}
      {!devices.length && (
        <div className="text-center py-12">
          <Cpu size={48} className="mx-auto text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg">No devices found for this location.</p>
        </div>
      )}

      {/* Device grid */}
      {devices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map(device => (
            <div
              key={device._id}
              onClick={() => onSelectKiosk(device.internalId)}
              className={`bg-zinc-900 p-6 rounded-xl border transition-all cursor-pointer
                ${selectedKiosk === device.internalId 
                  ? "border-blue-500 bg-zinc-800 shadow-lg shadow-blue-500/20" 
                  : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
            >
              <div className="p-3 bg-zinc-800 rounded-lg w-fit text-white">
                <Cpu size={24} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-white">{device.deviceId}</h3>
              <p className="text-sm text-zinc-400 mt-1">Model: {device.model || 'N/A'}</p>
              <p className="text-sm text-zinc-500 mt-1">Kiosk ID: {device.internalId}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {device.deviceType?.map(type => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-zinc-800 text-xs rounded text-zinc-300"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Devices;