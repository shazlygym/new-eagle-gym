import { useEffect, useState } from 'react';
import { Users, TrendingUp, DollarSign, Activity, Calendar, BarChart2, UserCheck } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import StatCard from '../components/StatCard';
import { analyticsApi } from '../api/analytics';
import { DashboardKPIs, RevenueDataPoint } from '../types';

const GOLD = '#C9A84C';
const DARK = '#2a2a2a';

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [newMembers, setNewMembers] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.getDashboard(),
      analyticsApi.getRevenue(6),
      analyticsApi.getNewMembers(6),
    ]).then(([k, r, nm]) => {
      setKpis(k);
      setRevenue(r);
      setNewMembers(nm);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const monthlyGrowth = kpis && kpis.lastMonthRevenue > 0
    ? Math.round(((kpis.monthlyRevenue - kpis.lastMonthRevenue) / kpis.lastMonthRevenue) * 100)
    : 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">لوحة التحكم</h1>
        <p className="text-dark-300 mt-1">مرحباً بك في Eagle Gym — نظرة عامة على الصالة</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="إجمالي الأعضاء"
          value={kpis?.totalMembers || 0}
          subtitle={`${kpis?.activeMembers || 0} نشط خلال 30 يوم`}
          icon={Users}
          color="gold"
        />
        <StatCard
          title="اشتراكات نشطة"
          value={kpis?.activeSubscriptions || 0}
          subtitle={`${kpis?.expiredSubscriptions || 0} منتهية`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="إيرادات الشهر"
          value={`${(kpis?.monthlyRevenue || 0).toLocaleString('ar-EG')} ج.م`}
          subtitle={`الإجمالي: ${(kpis?.totalRevenue || 0).toLocaleString('ar-EG')} ج.م`}
          icon={DollarSign}
          color="gold"
          trend={{ value: monthlyGrowth, label: 'عن الشهر الماضي' }}
        />
        <StatCard
          title="نسبة الالتزام"
          value={`${kpis?.engagementRate || 0}%`}
          subtitle={`${kpis?.todayCheckins || 0} حضور اليوم`}
          icon={Activity}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="section-title mb-0">الإيرادات الشهرية</h3>
            <DollarSign size={18} className="text-gold-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" stroke="#6e6e6e" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6e6e6e" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #C9A84C44', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New Members Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="section-title mb-0">أعضاء جدد</h3>
            <BarChart2 size={18} className="text-gold-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={newMembers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" stroke="#6e6e6e" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6e6e6e" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #C9A84C44', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-dark-300 text-sm mb-2">حضور اليوم</p>
          <p className="text-4xl font-black text-gold-400">{kpis?.todayCheckins || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-dark-300 text-sm mb-2">إجمالي الحضور</p>
          <p className="text-4xl font-black text-white">{kpis?.totalCheckins || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-dark-300 text-sm mb-2">معدل الانخراط</p>
          <p className="text-4xl font-black text-emerald-400">{kpis?.engagementRate || 0}%</p>
        </div>
      </div>
    </div>
  );
}
