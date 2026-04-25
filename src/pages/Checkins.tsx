import { useEffect, useState, useCallback } from 'react';
import { ChevronRight, ChevronLeft, QrCode } from 'lucide-react';
import { CheckIn } from '../types';
import apiClient from '../api/client';
import { CheckIn as CheckInType } from '../types';

export default function Checkins() {
  const [checkins, setCheckins] = useState<CheckInType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCheckins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/checkins', { params: { page, limit: 20 } });
      setCheckins(res.data.data);
      setTotal(res.data.meta?.total || 0);
      setTotalPages(res.data.meta?.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const handleManualCheckin = async () => {
    const phone = prompt('أدخل رقم هاتف العضو:');
    if (!phone) return;
    try {
      const memberRes = await apiClient.get('/members', { params: { search: phone, limit: 1 } });
      const member = memberRes.data.data?.[0];
      if (!member) return alert('لم يتم العثور على العضو');
      await apiClient.post('/checkins', { userId: member.id, method: 'MANUAL' });
      fetchCheckins();
    } catch {
      alert('فشل تسجيل الحضور');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-0">سجل الحضور</h1>
          <p className="text-dark-300 text-sm mt-1">إجمالي {total} حضور</p>
        </div>
        <button className="btn-gold" onClick={handleManualCheckin}>
          <QrCode size={18} /> تسجيل حضور
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600 bg-dark-800/50">
                <th className="table-header">العضو</th>
                <th className="table-header">الهاتف</th>
                <th className="table-header">رقم العضوية</th>
                <th className="table-header">الطريقة</th>
                <th className="table-header">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-dark-300">جارٍ التحميل...</td></tr>
              ) : checkins.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-dark-300">لا يوجد سجلات حضور</td></tr>
              ) : checkins.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold-400 font-bold text-xs">{c.user?.name?.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-white">{c.user?.name}</span>
                    </div>
                  </td>
                  <td className="table-cell" dir="ltr">{c.user?.phone}</td>
                  <td className="table-cell">
                    {c.user?.membershipNumber && <span className="badge-gold">{c.user.membershipNumber}</span>}
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      c.method === 'QR' ? 'bg-blue-500/15 text-blue-400' : 'bg-gold-500/15 text-gold-400'
                    }`}>
                      {c.method === 'QR' ? 'QR كود' : 'يدوي'}
                    </span>
                  </td>
                  <td className="table-cell text-dark-300">
                    {new Date(c.timestamp).toLocaleString('ar-EG')}
                  </td>
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
    </div>
  );
}
