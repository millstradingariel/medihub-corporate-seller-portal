import React, { useState } from 'react';
import { MapPin, Building2, Search, ArrowRight, Navigation } from 'lucide-react';
import { Location } from '../../../../types';

interface LocationsProps {
  locations: Location[];
  loading?: boolean;
  onSelectLocation: (location: Location) => void;
}

const Locations: React.FC<LocationsProps> = ({
  locations,
  loading,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = locations.filter((loc) =>
    loc.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
          <Navigation className="text-zinc-600" size={28} />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">No locations found</p>
          <p className="text-zinc-500 text-sm mt-1">No locations are linked to your company yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Sales</p>
          <h2 className="text-3xl font-bold text-white">Locations</h2>
          <p className="text-zinc-400 mt-1 text-sm">
            {locations.length} {locations.length === 1 ? 'location' : 'locations'} available
          </p>
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
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
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

      {/* No search results */}
      {filtered.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Search className="text-zinc-700" size={32} />
          <p className="text-zinc-400 text-sm">No locations match <span className="text-white">"{searchQuery}"</span></p>
        </div>
      )}

      {/* Grid */}
      <div className={`grid gap-5 ${filtered.length === 1
        ? 'grid-cols-1 max-w-sm'
        : filtered.length === 2
          ? 'grid-cols-1 md:grid-cols-2 max-w-2xl'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
        {filtered.map((loc, index) => {
          const id = String(loc._id || loc.location_id);
          const isHovered = hoveredId === id;

          return (
            <button
              key={id}
              onClick={() => onSelectLocation(loc)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden"
              style={{
                background: isHovered
                  ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
                  : '#18181b',
                borderColor: isHovered ? 'rgb(99 102 241 / 0.5)' : 'rgb(39 39 42)',
                boxShadow: isHovered ? '0 0 30px rgb(99 102 241 / 0.1)' : 'none',
                animationDelay: `${index * 60}ms`,
              }}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300"
                style={{
                  background: isHovered
                    ? 'linear-gradient(90deg, transparent, rgb(99 102 241), transparent)'
                    : 'transparent',
                }}
              />

              <div className="p-6">
                {/* Icon + Arrow row */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                    style={{
                      background: isHovered
                        ? 'linear-gradient(135deg, rgb(99 102 241 / 0.3), rgb(129 140 248 / 0.2))'
                        : 'rgb(39 39 42)',
                    }}
                  >
                    <MapPin
                      size={22}
                      className="transition-colors duration-300"
                      style={{ color: isHovered ? 'rgb(129 140 248)' : 'rgb(113 113 122)' }}
                    />
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
                    style={{
                      background: isHovered ? 'rgb(99 102 241 / 0.15)' : 'transparent',
                      transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                    }}
                  >
                    <ArrowRight
                      size={16}
                      className="transition-colors duration-300"
                      style={{ color: isHovered ? 'rgb(129 140 248)' : 'rgb(63 63 70)' }}
                    />
                  </div>
                </div>

                {/* Location name */}
                <h3
                  className="text-lg font-bold mb-1 transition-colors duration-300 leading-tight"
                  style={{ color: isHovered ? 'white' : 'rgb(228 228 231)' }}
                >
                  {loc.location_name}
                </h3>

                {/* Divider */}
                <div
                  className="my-4 h-px transition-colors duration-300"
                  style={{ background: isHovered ? 'rgb(99 102 241 / 0.2)' : 'rgb(39 39 42)' }}
                />
              </div>

              {/* Bottom glow */}
              {isHovered && (
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
    </div>
  );
};

export default Locations;