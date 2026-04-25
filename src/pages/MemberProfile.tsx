import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, CreditCard, Activity, Dumbbell, Scale, BadgeCheck, BadgeX, RefreshCw, Plus, Target, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { User, MemberAnalytics, Payment, WorkoutLog, MemberSubscription, Exercise } from '../types';
import { membersApi } from '../api/members';
import { analyticsApi } from '../api/analytics';
import { paymentsApi } from '../api/payments';
import { workoutsApi } from '../api/workouts';
import AssignSubscriptionModal from '../components/AssignSubscriptionModal';
import PaymentModal from '../components/PaymentModal';
import AssignWorkoutModal from '../components/AssignWorkoutModal';

const GOLD = '#C9A84C';

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'payments' | 'stats'>('overview');
  const [showAssignSub, setShowAssignSub] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAssignWorkout, setShowAssignWorkout] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, a, p, w, ex, prog] = await Promise.all([
        membersApi.getById(id),
        analyticsApi.getMemberAnalytics(id),
        paymentsApi.getMemberPayments(id),
        workoutsApi.getMemberLogs(id),
        workoutsApi.getExercises(),
        workoutsApi.getProgram(id),
      ]);
      setMember(m);
      setAnalytics(a);
      setPayments(p);
      setWorkouts(w);
      setExercises(ex);
      setProgram(prog);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromProgram = async (exerciseId: string) => {
    if (!id) return;
    try {
      await workoutsApi.removeFromProgram(id, exerciseId);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const openWhatsApp = (type: 'welcome' | 'renewal') => {
    if (!member) return;
    const msgs = {
      welcome: `أهلاً ${member.name}، مرحباً بك في Eagle Gym 🦅\nنتمنى لك تجربة رياضية رائعة معنا!`,
      renewal: `أهلاً ${member.name}، اشتراكك في Eagle Gym 🦅 على وشك الانتهاء.\nتواصل معنا لتجديد اشتراكك والاستمرار في رحلتك الرياضية!`,
    };
    const msg = encodeURIComponent(msgs[type]);
    window.open(`https://wa.me/2${member.phone}?text=${msg}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!member) return <div className="text-center py-20 text-dark-300">العضو غير موجود</div>;

  const sub = member.memberSubscriptions?.[0];
  const bodyStats = analytics?.bodyStats || [];
  const weightData = bodyStats.map(s => ({ date: new Date(s.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }), weight: s.weight }));

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-dark-300 hover:text-gold-400 transition-colors mb-6 text-sm">
        <ArrowRight size={16} /> العودة للأعضاء
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-gold-400 font-black text-2xl">{member.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">{member.name}</h1>
            <p className="text-dark-300" dir="ltr">{member.phone}</p>
            {member.membershipNumber && <span className="badge-gold mt-1 inline-flex">{member.membershipNumber}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openWhatsApp('welcome')} className="btn-ghost text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
              <MessageCircle size={16} /> ترحيب
            </button>
            <button onClick={() => openWhatsApp('renewal')} className="btn-ghost text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
              <MessageCircle size={16} /> تذكير تجديد
            </button>
            <button onClick={() => setShowAssignSub(true)} className="btn-ghost">
              <RefreshCw size={16} /> تجديد اشتراك
            </button>
            <button onClick={() => setShowPayment(true)} className="btn-gold">
              <CreditCard size={16} /> تسجيل دفعة
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-dark-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'text-gold-400 border-gold-400' : 'text-dark-400 border-transparent hover:text-dark-200'}`}
        >
          نظرة عامة
        </button>
        <button
          onClick={() => setActiveTab('workouts')}
          className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${activeTab === 'workouts' ? 'text-gold-400 border-gold-400' : 'text-dark-400 border-transparent hover:text-dark-200'}`}
        >
          التمارين
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${activeTab === 'payments' ? 'text-gold-400 border-gold-400' : 'text-dark-400 border-transparent hover:text-dark-200'}`}
        >
          المدفوعات
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Subscription + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`card ${sub?.status === 'ACTIVE' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <p className="text-dark-300 text-sm mb-2">الاشتراك الحالي</p>
              {sub ? (
                <>
                  <p className="text-xl font-bold text-white mb-1">{sub.subscription.name}</p>
                  <p className="text-dark-300 text-xs mb-3">
                    {new Date(sub.startDate).toLocaleDateString('ar-EG')} — {new Date(sub.endDate).toLocaleDateString('ar-EG')}
                  </p>
                  {sub.status === 'ACTIVE'
                    ? <span className="badge-active"><BadgeCheck size={12} /> نشط</span>
                    : <span className="badge-expired"><BadgeX size={12} /> منتهي</span>
                  }
                </>
              ) : <p className="text-dark-400">لا يوجد اشتراك</p>}
            </div>

            <div className="card text-center">
              <p className="text-dark-300 text-sm mb-2">معدل الالتزام</p>
              <p className="text-4xl font-black text-gold-400">{analytics?.commitmentRate || 0}%</p>
              <p className="text-dark-400 text-xs mt-2">{analytics?.completedWorkouts || 0} / {analytics?.totalWorkouts || 0} تمرين مكتمل</p>
            </div>

            <div className="card text-center">
              <p className="text-dark-300 text-sm mb-2">تمارين هذا الأسبوع</p>
              <p className="text-4xl font-black text-emerald-400">{analytics?.weeklyWorkouts || 0}</p>
              <p className="text-dark-400 text-xs mt-2">الأسبوع الحالي</p>
            </div>
          </div>

          {/* Weight Chart */}
          {weightData.length > 1 && (
            <div className="card mb-6">
              <h3 className="section-title">تطور الوزن</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#6e6e6e" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #C9A84C44', borderRadius: 8, color: '#fff' }} />
                  <Area type="monotone" dataKey="weight" stroke={GOLD} strokeWidth={2} fill="url(#wGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {activeTab === 'workouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Program Sidebar - Redesigned for Groups/Days */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card border-gold-500/20">
              <div className="flex items-center justify-between mb-4 border-b border-dark-600 pb-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Target size={18} className="text-gold-500" /> البرنامج التدريبي المخصص
                </h3>
              </div>
              
              <div className="space-y-6">
                {program.length === 0 ? (
                  <p className="text-dark-400 text-xs text-center py-4">لا يوجد برنامج محدد لهذا العضو بعد</p>
                ) : (
                  Object.entries(
                    program.reduce((acc, p) => {
                      const day = p.dayName || 'عام';
                      if (!acc[day]) acc[day] = [];
                      acc[day].push(p);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([dayName, exercises]) => (
                    <div key={dayName} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-gold-400 text-[10px] font-black uppercase tracking-widest">{dayName}</p>
                        <span className="text-dark-500 text-[8px]">{exercises.length} تمارين</span>
                      </div>
                      <div className="space-y-1">
                        {exercises.map((p: any) => (
                          <div key={p.id} className="bg-dark-900/50 p-2 rounded border border-dark-600/30 flex items-center justify-between group hover:border-gold-500/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-[11px] font-bold truncate">{p.exercise.name}</p>
                              <div className="flex gap-2 mt-0.5">
                                <span className="text-dark-500 text-[9px]">{p.setsCount} مجموعات</span>
                                {/* Mini progress view for Admin */}
                                <div className="flex gap-1 ml-auto pr-2 border-r border-dark-700">
                                   {[1,2,3,4].map(w => (
                                     <div key={w} className="w-1.5 h-1.5 rounded-full bg-dark-700" title={`الأسبوع ${w}`}></div>
                                   ))}
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveFromProgram(p.exerciseId)}
                              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowAssignWorkout(true)} 
                className="btn-ghost w-full mt-6 text-xs py-2 border-dashed border-dark-600 hover:border-gold-500/50"
              >
                <Plus size={14} /> إضافة تمرين لليوم
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">سجل النشاط</h3>
              <p className="text-dark-400 text-xs">آخر 30 يوم</p>
            </div>

            {workouts.length === 0 ? (
              <div className="card text-center py-10 text-dark-400">لا يوجد سجل تمارين بعد</div>
            ) : (
              <div className="space-y-4">
                {workouts.map(log => (
                  <div key={log.id} className="card">
                    <div className="flex items-center justify-between mb-4 border-b border-dark-600 pb-2">
                      <p className="text-white font-bold">{new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      {log.completed ? <span className="badge-active text-[10px]">مكتمل</span> : <span className="badge-expired text-[10px]">قيد التنفيذ</span>}
                    </div>
                    <div className="space-y-3">
                      {log.workoutSets.map(set => (
                        <div key={set.id} className="flex items-center justify-between bg-dark-900/50 p-3 rounded-lg border border-dark-600/50">
                          <div>
                            <p className="text-white text-sm font-bold">{set.exercise.name}</p>
                            <p className="text-dark-400 text-xs">المجموعة {set.setNumber}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-gold-400 text-sm font-black">{set.weight} كغ × {set.reps}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <h3 className="section-title">سجل المدفوعات</h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-dark-600 last:border-0">
                <div>
                  <p className="text-white text-sm font-semibold">{Number(p.amount).toFixed(0)} ج.م</p>
                  <p className="text-dark-400 text-xs">{p.subscription?.name || 'غير محدد'} · {p.method === 'CASH' ? 'كاش' : p.method === 'CARD' ? 'بطاقة' : 'تحويل'}</p>
                </div>
                <p className="text-dark-400 text-xs">{new Date(p.date).toLocaleDateString('ar-EG')}</p>
              </div>
            ))}
            {payments.length === 0 && <p className="text-center py-6 text-dark-400">لا يوجد مدفوعات مسجلة</p>}
          </div>
        </div>
      )}

      {showAssignSub && (
        <AssignSubscriptionModal
          userId={member.id}
          memberName={member.name}
          onClose={() => setShowAssignSub(false)}
          onSave={fetchAll}
        />
      )}
      {showPayment && (
        <PaymentModal
          preSelectedUser={member}
          onClose={() => setShowPayment(false)}
          onSave={fetchAll}
        />
      )}
      {showAssignWorkout && (
        <AssignWorkoutModal
          userId={member.id}
          memberName={member.name}
          exercises={exercises}
          onClose={() => setShowAssignWorkout(false)}
          onSave={fetchAll}
        />
      )}
    </div>
  );
}
