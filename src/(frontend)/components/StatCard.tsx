import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: string; // Keeping prop for compatibility but ignoring content for theme consistency
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl shadow-sm border border-zinc-800 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700/50">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;