import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign } from 'lucide-react';
import { Subscription } from '../types';
import { subscriptionsApi } from '../api/subscriptions';
import SubscriptionModal from '../components/SubscriptionModal';

export default function Subscriptions() {
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Subscription | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionsApi.getAll();
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد إلغاء هذه الباقة؟')) return;
    try {
      await subscriptionsApi.delete(id);
      fetchPlans();
    } catch { alert('فشل الحذف'); }
  };

  const durationLabel = (days: number) => {
    if (days === 7) return 'أسبوع';
    if (days === 30) return 'شهر';
    if (days === 90) return '3 أشهر';
    if (days === 180) return '6 أشهر';
    if (days === 365) return 'سنة';
    return `${days} يوم`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-0">الاشتراكات</h1>
          <p className="text-dark-300 text-sm mt-1">{plans.length} باقة متاحة</p>
        </div>
        <button className="btn-gold" onClick={() => { setEditPlan(null); setShowModal(true); }}>
          <Plus size={18} /> باقة جديدة
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="card hover:border-gold-500/40 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  {plan.description && <p className="text-dark-300 text-sm mt-1">{plan.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditPlan(plan); setShowModal(true); }}
                    className="p-2 rounded-lg text-gold-400 hover:bg-gold-500/10 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(plan.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2 text-dark-300 text-sm">
                  <Clock size={14} className="text-gold-500" />
                  <span>{durationLabel(plan.durationDays)}</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gold-400">{Number(plan.price).toFixed(0)}</p>
                  <p className="text-dark-400 text-xs">ج.م</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-600">
                <p className="text-dark-400 text-xs">
                  {Number(plan.price / plan.durationDays).toFixed(1)} ج.م / يوم
                </p>
              </div>
            </div>
          ))}

          {/* Add New */}
          <div
            onClick={() => { setEditPlan(null); setShowModal(true); }}
            className="card border-dashed border-dark-400 hover:border-gold-500/50 cursor-pointer flex flex-col items-center justify-center gap-3 py-10 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <Plus size={22} className="text-gold-400" />
            </div>
            <p className="text-dark-300 font-semibold">إضافة باقة جديدة</p>
          </div>
        </div>
      )}

      {showModal && (
        <SubscriptionModal
          plan={editPlan}
          onClose={() => { setShowModal(false); setEditPlan(null); }}
          onSave={fetchPlans}
        />
      )}
    </div>
  );
}
