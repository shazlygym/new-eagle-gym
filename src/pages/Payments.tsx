import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, ChevronRight, ChevronLeft, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Payment, RevenueDataPoint } from '../types';
import { paymentsApi } from '../api/payments';
import PaymentModal from '../components/PaymentModal';

const GOLD = '#C9A84C';

const methodLabel = { CASH: 'كاش', CARD: 'بطاقة', TRANSFER: 'تحويل' };

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ payments: data, meta }, rev] = await Promise.all([
        paymentsApi.getAll({ page, limit: 15 }),
        paymentsApi.getRevenue(6),
      ]);
      setPayments(data);
      setTotal(meta?.total || 0);
      setTotalPages(meta?.totalPages || 1);
      setRevenue(rev);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-0">المدفوعات</h1>
          <p className="text-dark-300 text-sm mt-1">إجمالي {total} دفعة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => paymentsApi.exportCsv()} className="btn-ghost">
            <Download size={16} /> تصدير CSV
          </button>
          <button className="btn-gold" onClick={() => setShowModal(true)}>
            <Plus size={18} /> دفعة جديدة
          </button>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">الإيرادات الشهرية (6 أشهر)</h3>
          <div className="text-right">
            <p className="text-gold-400 font-black text-xl">{totalRevenue.toLocaleString('ar-EG')} ج.م</p>
            <p className="text-dark-400 text-xs">المجموع</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={revenue}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="month" stroke="#6e6e6e" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6e6e6e" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #C9A84C44', borderRadius: 8, color: '#fff' }} />
            <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600 bg-dark-800/50">
                <th className="table-header">العضو</th>
                <th className="table-header">المبلغ</th>
                <th className="table-header">الطريقة</th>
                <th className="table-header">الاشتراك</th>
                <th className="table-header">التاريخ</th>
                <th className="table-header">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-dark-300">جارٍ التحميل...</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-semibold text-white">{p.user?.name}</p>
                    <p className="text-dark-400 text-xs" dir="ltr">{p.user?.phone}</p>
                  </td>
                  <td className="table-cell">
                    <span className="text-gold-400 font-bold">{Number(p.amount).toFixed(0)} ج.م</span>
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      p.method === 'CASH' ? 'bg-emerald-500/15 text-emerald-400' :
                      p.method === 'CARD' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-purple-500/15 text-purple-400'
                    }`}>
                      {methodLabel[p.method]}
                    </span>
                  </td>
                  <td className="table-cell text-dark-200">{p.subscription?.name || '—'}</td>
                  <td className="table-cell text-dark-300">{new Date(p.date).toLocaleDateString('ar-EG')}</td>
                  <td className="table-cell text-dark-400 text-xs">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-600">
            <p className="text-dark-300 text-sm">صفحة {page} من {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost py-1.5 px-3 disabled:opacity-40"><ChevronRight size={16} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost py-1.5 px-3 disabled:opacity-40"><ChevronLeft size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
