import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User, Subscription } from '../types';
import { paymentsApi } from '../api/payments';
import { subscriptionsApi } from '../api/subscriptions';
import { membersApi } from '../api/members';

interface PaymentModalProps {
  preSelectedUser?: User | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PaymentModal({ preSelectedUser, onClose, onSave }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [form, setForm] = useState({
    userId: preSelectedUser?.id || '',
    subscriptionId: '',
    amount: '',
    method: 'CASH' as 'CASH' | 'CARD' | 'TRANSFER',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      membersApi.getAll({ limit: 200 }),
      subscriptionsApi.getAll(),
    ]).then(([m, s]) => {
      setMembers(m.members);
      setSubscriptions(s);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await paymentsApi.record({
        userId: form.userId,
        subscriptionId: form.subscriptionId || undefined,
        amount: parseFloat(form.amount),
        method: form.method,
        date: form.date || undefined,
        notes: form.notes || undefined,
      });
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
          <h2 className="text-xl font-bold text-white">تسجيل دفعة</h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

          <div>
            <label className="label">العضو *</label>
            <select className="input-field" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required>
              <option value="">اختر عضو</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
            </select>
          </div>

          <div>
            <label className="label">الاشتراك (اختياري)</label>
            <select className="input-field" value={form.subscriptionId} onChange={e => setForm(f => ({ ...f, subscriptionId: e.target.value }))}>
              <option value="">بدون اشتراك محدد</option>
              {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name} — {s.price} ج.م</option>)}
            </select>
          </div>

          <div>
            <label className="label">المبلغ (ج.م) *</label>
            <input type="number" className="input-field" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min={0} step={0.5} required placeholder="300" />
          </div>

          <div>
            <label className="label">طريقة الدفع *</label>
            <select className="input-field" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as 'CASH' | 'CARD' | 'TRANSFER' }))}>
              <option value="CASH">كاش</option>
              <option value="CARD">بطاقة</option>
              <option value="TRANSFER">تحويل</option>
            </select>
          </div>

          <div>
            <label className="label">التاريخ</label>
            <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-gold flex-1">{loading ? '...' : 'تسجيل'}</button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
