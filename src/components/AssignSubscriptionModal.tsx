import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Subscription } from '../types';
import { subscriptionsApi } from '../api/subscriptions';

interface AssignSubscriptionModalProps {
  userId: string;
  memberName: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AssignSubscriptionModal({ userId, memberName, onClose, onSave }: AssignSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [form, setForm] = useState({ subscriptionId: '', startDate: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    subscriptionsApi.getAll().then(setSubscriptions);
  }, []);

  const selected = subscriptions.find(s => s.id === form.subscriptionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await subscriptionsApi.assign({ userId, subscriptionId: form.subscriptionId, startDate: form.startDate });
      onSave();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-bold text-white">تعيين اشتراك — <span className="text-gold-400">{memberName}</span></h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

          <div>
            <label className="label">الباقة *</label>
            <select className="input-field" value={form.subscriptionId} onChange={e => setForm(f => ({ ...f, subscriptionId: e.target.value }))} required>
              <option value="">اختر باقة</option>
              {subscriptions.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {Number(s.price).toFixed(0)} ج.م ({s.durationDays} يوم)</option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="card-gold p-4 rounded-xl text-sm">
              <p className="text-gold-400 font-bold mb-1">{selected.name}</p>
              <p className="text-dark-200">{selected.description}</p>
              <p className="text-white font-semibold mt-2">{Number(selected.price).toFixed(0)} ج.م · {selected.durationDays} يوم</p>
            </div>
          )}

          <div>
            <label className="label">تاريخ البدء</label>
            <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || !form.subscriptionId} className="btn-gold flex-1">{loading ? '...' : 'تعيين الاشتراك'}</button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
