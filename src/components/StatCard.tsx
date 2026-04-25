import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'gold' | 'green' | 'red' | 'blue';
}

const colorMap = {
  gold:  { bg: 'bg-gold-500/10',  border: 'border-gold-500/30',  icon: 'text-gold-400',  text: 'text-gold-400'  },
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', text: 'text-emerald-400' },
  red:   { bg: 'bg-red-500/10',   border: 'border-red-500/30',   icon: 'text-red-400',   text: 'text-red-400'   },
  blue:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/30',  icon: 'text-blue-400',  text: 'text-blue-400'  },
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'gold' }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={`card hover:border-gold-500/40 transition-all duration-300 group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-dark-300 text-sm font-semibold mb-2">{title}</p>
          <p className="text-3xl font-black text-white mb-1">{value}</p>
          {subtitle && <p className="text-dark-300 text-xs">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-dark-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center
                         group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
