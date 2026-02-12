import React, { useEffect, useState } from "react";
import { Cpu, ArrowLeft } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export interface Device {
  _id: string;
  deviceId: string;
  model: string;
  internalId: string; // kiosk ID
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
    if (!locationId) return;

    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/devices?locationId=${locationId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        console.log("DEVICES API:", json);

        setDevices(json.data || []);
      } catch (err) {
        console.error("Failed to fetch devices", err);
        setError("Failed to load devices");
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [locationId]);

  if (loading) return <div className="text-zinc-400 animate-pulse">Loading devices…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Devices</h2>
          <p className="text-zinc-400">{locationName}</p>
        </div>
      </div>

      {/* Empty state */}
      {!devices.length && <div className="text-zinc-400">No devices found for this location.</div>}

      {/* Device list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
          <div
            key={device._id}
            onClick={() => onSelectKiosk(device.internalId)}
            className={`bg-zinc-900 p-6 rounded-xl border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition
              ${selectedKiosk === device.internalId ? "border-green-500" : ""}`}
          >
            <div className="p-3 bg-zinc-800 rounded-lg w-fit text-white">
              <Cpu size={24} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">{device.deviceId}</h3>
            <p className="text-sm text-zinc-400 mt-1">Model: {device.model}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {device.deviceType.map(type => (
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
    </div>
  );
};

export default Devices;
