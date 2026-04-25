import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, DollarSign,
  QrCode, LogOut, Dumbbell, Settings, ChevronLeft, Download, Target
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
  { to: '/members',   icon: Users,          label: 'الأعضاء'  },
  { to: '/exercises', icon: Dumbbell,       label: 'دليل التمارين' },
  { to: '/subscriptions', icon: Target,     label: 'الاشتراكات' },
  { to: '/payments',  icon: DollarSign,     label: 'المدفوعات' },
  { to: '/checkins',  icon: QrCode,         label: 'الحضور'   },
  { to: '/exports',   icon: Download,       label: 'تصدير (CSV)' },
];

export default function Sidebar() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-64 bg-dark-800 border-l border-dark-600 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold">
            <span className="text-dark-900 font-black text-lg">E</span>
          </div>
          <div>
            <h1 className="text-white font-black text-lg leading-none">Eagle Gym</h1>
            <p className="text-gold-500 text-xs font-semibold mt-0.5">لوحة الإدارة</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-dark-600">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-500/50 flex items-center justify-center">
            <span className="text-gold-400 font-bold text-sm">{user?.name?.charAt(0) || 'A'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-dark-300 text-xs">{user?.phone}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
