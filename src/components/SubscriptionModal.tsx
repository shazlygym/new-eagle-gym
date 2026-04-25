import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Subscription } from '../types';
import { subscriptionsApi } from '../api/subscriptions';

interface SubscriptionModalProps {
  plan?: Subscription | null;
  onClose: () => void;
  onSave: () => void;
}

export default function SubscriptionModal({ plan, onClose, onSave }: SubscriptionModalProps) {
  const isEdit = !!plan;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: plan?.name || '',
    durationDays: plan?.durationDays || 30,
    price: plan?.price || 0,
    description: plan?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await subscriptionsApi.update(plan!.id, form);
      } else {
        await subscriptionsApi.create(form);
      }
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
          <h2 className="text-xl font-bold text-white">{isEdit ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

          <div>
            <label className="label">اسم الباقة *</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="شهري" required />
          </div>
          <div>
            <label className="label">المدة (أيام) *</label>
            <input type="number" className="input-field" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: +e.target.value }))} min={1} required />
          </div>
          <div>
            <label className="label">السعر (ج.م) *</label>
            <input type="number" className="input-field" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} min={0} step={0.5} required />
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف الباقة..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-gold flex-1">
              {loading ? '...' : isEdit ? 'حفظ' : 'إضافة'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
