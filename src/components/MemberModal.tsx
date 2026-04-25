import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User, Subscription } from '../types';
import { membersApi } from '../api/members';
import { subscriptionsApi } from '../api/subscriptions';

interface MemberModalProps {
  member?: User | null;
  onClose: () => void;
  onSave: () => void;
}

export default function MemberModal({ member, onClose, onSave }: MemberModalProps) {
  const isEdit = !!member;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [form, setForm] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    password: '',
    membershipNumber: member?.membershipNumber || '',
    active: member?.active ?? true,
    subscriptionId: '',
    startDate: '',
  });

  useEffect(() => {
    subscriptionsApi.getAll().then(setSubscriptions).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        const updateData: Record<string, unknown> = {
          name: form.name,
          phone: form.phone,
          membershipNumber: form.membershipNumber || undefined,
          active: form.active,
        };
        if (form.password) updateData.password = form.password;
        await membersApi.update(member!.id, updateData);
      } else {
        const created = await membersApi.create({
          name: form.name,
          phone: form.phone,
          password: form.password,
          membershipNumber: form.membershipNumber || undefined,
        });
        // Assign subscription if selected
        if (form.subscriptionId) {
          await subscriptionsApi.assign({
            userId: created.id,
            subscriptionId: form.subscriptionId,
            startDate: form.startDate || undefined,
          });
        }
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'تعديل العضو' : 'إضافة عضو جديد'}
          </h2>
          <button onClick={onClose} className="text-dark-300 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="label">الاسم الكامل *</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="أحمد محمد" required />
          </div>

          <div>
            <label className="label">رقم الهاتف *</label>
            <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" required dir="ltr" />
          </div>

          <div>
            <label className="label">{isEdit ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور *'}</label>
            <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" required={!isEdit} />
          </div>

          <div>
            <label className="label">رقم العضوية</label>
            <input className="input-field" value={form.membershipNumber} onChange={e => setForm(f => ({ ...f, membershipNumber: e.target.value }))} placeholder="EG001" dir="ltr" />
          </div>

          {!isEdit && subscriptions.length > 0 && (
            <>
              <div>
                <label className="label">الاشتراك (اختياري)</label>
                <select className="input-field" value={form.subscriptionId} onChange={e => setForm(f => ({ ...f, subscriptionId: e.target.value }))}>
                  <option value="">بدون اشتراك</option>
                  {subscriptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.price} ج.م ({s.durationDays} يوم)</option>
                  ))}
                </select>
              </div>
              {form.subscriptionId && (
                <div>
                  <label className="label">تاريخ بداية الاشتراك</label>
                  <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              )}
            </>
          )}

          {isEdit && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500" />
              <label htmlFor="active" className="text-sm text-dark-200 font-semibold cursor-pointer">الحساب نشط</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-gold flex-1">
              {loading ? '...' : isEdit ? 'حفظ التعديلات' : 'إضافة العضو'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
