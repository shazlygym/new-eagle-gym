import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { membersApi } from '../api/members';
import { analyticsApi } from '../api/analytics';
import { checkinsApi } from '../api/checkins';
import { ArrowRight, QrCode, Scale, Activity, BadgeCheck, BadgeX, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { User, MemberAnalytics } from '../types';

const GOLD = '#C9A84C';

export default function MemberProfileView() {
  const user = useAuthStore(s => s.user);
  const [profile, setProfile] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      Promise.all([
        membersApi.getMyProfile(),
        analyticsApi.getMyAnalytics(),
        checkinsApi.generateQR()
      ]).then(([m, a, qr]) => {
        setProfile(m);
        setAnalytics(a);
        setQrCode(qr.qrCode);
      }).catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center text-white">جاري التحميل...</div>;
  if (!profile) return <div className="p-8 text-center text-white">فشل تحميل البيانات</div>;

  const sub = profile.memberSubscriptions?.[0];
  const weightData = (analytics?.bodyStats || []).map(s => ({
    date: new Date(s.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    weight: s.weight
  })).reverse();

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-2 text-dark-300 hover:text-gold-400 transition-colors text-sm">
          <ArrowRight size={16} /> العودة للرئيسية
        </Link>
        <h2 className="text-xl font-bold text-white">ملفي الشخصي</h2>
      </div>

      {/* QR Code Section */}
      <div className="card border-gold-500/20 flex flex-col items-center text-center p-8">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <QrCode size={20} className="text-gold-500" /> كود الدخول الخاص بك
        </h3>
        <div className="bg-white p-4 rounded-2xl mb-4 shadow-2xl">
          {qrCode ? (
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 bg-dark-100 animate-pulse rounded-lg" />
          )}
        </div>
        <p className="text-dark-300 text-sm">استخدم هذا الكود عند مدخل الجيم لتسجيل حضورك</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <Activity size={24} className="text-gold-500 mx-auto mb-2" />
          <p className="text-dark-400 text-[10px] uppercase">معدل الالتزام</p>
          <p className="text-2xl font-black text-white">{analytics?.commitmentRate || 0}%</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp size={24} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-dark-400 text-[10px] uppercase">تمارين الأسبوع</p>
          <p className="text-2xl font-black text-white">{analytics?.weeklyWorkouts || 0}</p>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">اشتراكي الحالي</h3>
          {sub?.status === 'ACTIVE' ? (
            <span className="badge-active text-[10px]"><BadgeCheck size={12} /> نشط</span>
          ) : (
            <span className="badge-expired text-[10px]"><BadgeX size={12} /> منتهي</span>
          )}
        </div>
        {sub ? (
          <div className="space-y-2">
            <p className="text-gold-400 font-bold">{sub.subscription.name}</p>
            <p className="text-dark-300 text-xs">
              ينتهي في: {new Date(sub.endDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="w-full bg-dark-900 rounded-full h-1.5 mt-4">
               <div 
                 className="bg-gold-500 h-1.5 rounded-full transition-all duration-1000" 
                 style={{ width: `${Math.max(0, Math.min(100, (new Date().getTime() - new Date(sub.startDate).getTime()) / (new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) * 100))}%` }}
               />
            </div>
          </div>
        ) : (
          <p className="text-dark-400 text-sm italic">لا يوجد اشتراك نشط</p>
        )}
      </div>

      {/* Weight Chart */}
      {weightData.length > 1 && (
        <div className="card p-4">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <Scale size={20} className="text-emerald-500" /> تطور وزنك
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="date" stroke="#6e6e6e" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #C9A84C44', borderRadius: 8, color: '#fff' }}
                  itemStyle={{ color: GOLD }}
                />
                <Area type="monotone" dataKey="weight" stroke={GOLD} strokeWidth={3} fill="url(#mGrad)" dot={{ fill: GOLD, r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
