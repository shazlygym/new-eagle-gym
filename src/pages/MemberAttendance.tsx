import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { checkinsApi } from '../api/checkins';
import { Calendar, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MemberAttendance() {
  const user = useAuthStore(s => s.user);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkinsApi.getMyCheckins().then(data => {
        setAttendance(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center text-white">جاري التحميل...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-2 text-dark-300 hover:text-gold-400 transition-colors text-sm">
          <ArrowRight size={16} /> العودة للرئيسية
        </Link>
        <h2 className="text-xl font-bold text-white">سجل الحضور</h2>
      </div>

      <div className="card">
        <div className="space-y-4">
          {attendance.length === 0 ? (
            <div className="text-center py-10 text-dark-400">لا يوجد سجل حضور بعد</div>
          ) : (
            attendance.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-dark-600/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-white font-bold">{new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-dark-400 text-xs">حضور مؤكد</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-dark-500 uppercase tracking-widest">{new Date(log.date).getFullYear()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-blue-400 text-xs text-center">
          📅 انتظامك في الحضور هو أهم عامل لنجاحك. استمر!
        </p>
      </div>
    </div>
  );
}
