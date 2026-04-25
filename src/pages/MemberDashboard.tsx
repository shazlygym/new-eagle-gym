import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { Activity, Dumbbell, Calendar, Target, Scale } from 'lucide-react';
import api from '../api/client';
import { analyticsApi } from '../api/analytics';

export default function MemberDashboard() {
  const user = useAuthStore(s => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bodyWeight, setBodyWeight] = useState('');
  const [loggingWeight, setLoggingWeight] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api.get('/members/me/profile').then(res => {
        setProfile(res.data.data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user]);

  const handleLogWeight = async () => {
    if (!bodyWeight) return;
    setLoggingWeight(true);
    try {
      await analyticsApi.logBodyStat({ weight: parseFloat(bodyWeight) });
      alert('تم تسجيل الوزن بنجاح');
      setBodyWeight('');
    } catch (err) {
      console.error(err);
      alert('خطأ في تسجيل الوزن');
    } finally {
      setLoggingWeight(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">جاري التحميل...</div>;

  const activeSub = profile?.memberSubscriptions?.[0];
  const isExpired = activeSub?.status === 'EXPIRED';

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">أهلاً بك، {user?.name}</h2>
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="bg-dark-900 rounded-lg p-4 flex-1 min-w-[150px] border border-dark-600">
            <div className="flex items-center gap-2 text-dark-300 mb-1">
              <Dumbbell size={16} />
              <span className="text-sm">الاشتراك الحالي</span>
            </div>
            <p className="text-white font-bold">{activeSub?.subscription?.name || 'لا يوجد'}</p>
          </div>
          
          {activeSub && (
            <div className="bg-dark-900 rounded-lg p-4 flex-1 min-w-[150px] border border-dark-600">
              <div className="flex items-center gap-2 text-dark-300 mb-1">
                <Calendar size={16} />
                <span className="text-sm">تاريخ الانتهاء</span>
              </div>
              <p className={`font-bold ${isExpired ? 'text-red-500' : 'text-green-500'}`}>
                {new Date(activeSub.endDate).toLocaleDateString('ar-EG')}
              </p>
            </div>
          )}

          <div className="bg-dark-900 rounded-lg p-4 flex-1 min-w-[150px] border border-dark-600">
            <div className="flex items-center gap-2 text-dark-300 mb-1">
              <Activity size={16} />
              <span className="text-sm">الحالة</span>
            </div>
            <p className={`font-bold ${!activeSub ? 'text-dark-300' : isExpired ? 'text-red-500' : 'text-green-500'}`}>
              {!activeSub ? 'غير مشترك' : isExpired ? 'منتهي' : 'نشط'}
            </p>
          </div>
        </div>
      </div>

      {/* Member actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Link to="/app/workouts" className="bg-dark-800 border border-dark-600 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition">
          <div className="w-12 h-12 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center mb-2">
            <Dumbbell size={24} />
          </div>
          <span className="text-white font-semibold">تماريني اليوم</span>
        </Link>

        <Link to="/app/attendance" className="bg-dark-800 border border-dark-600 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mb-2">
            <Calendar size={24} />
          </div>
          <span className="text-white font-semibold">سجل الحضور</span>
        </Link>

        <Link to="/app/profile" className="bg-dark-800 border border-dark-600 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-dark-700 transition">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
            <Target size={24} />
          </div>
          <span className="text-white font-semibold">قياسات الجسم</span>
        </Link>
      </div>

      {/* Body Weight Logging */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Scale size={20} className="text-emerald-500" /> تسجيل وزن الجسم اليوم
        </h3>
        <div className="flex gap-3">
          <input 
            type="number" 
            placeholder="الوزن بالكيلوجرام" 
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            className="input-field flex-1"
          />
          <button 
            onClick={handleLogWeight}
            disabled={!bodyWeight || loggingWeight}
            className="btn-gold px-6"
          >
            {loggingWeight ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <h3 className="text-lg font-bold text-white mb-4">التزامك بالأهداف 🎯</h3>
        <p className="text-dark-300 text-sm leading-relaxed">
          سجل أوزانك يومياً لتتابع تطورك. تذكر أن الاستمرارية هي مفتاح النجاح في Eagle Gym!
        </p>
      </div>
    </div>
  );
}
