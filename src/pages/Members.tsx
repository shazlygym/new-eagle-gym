import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, BadgeCheck, BadgeX, ChevronRight, ChevronLeft, MessageCircle } from 'lucide-react';
import { User } from '../types';
import { membersApi } from '../api/members';
import MemberModal from '../components/MemberModal';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { members: data, meta } = await membersApi.getAll({ page, limit: 15, search: search || undefined });
      setMembers(data);
      setTotalPages(meta?.totalPages || 1);
      setTotal(meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
      await membersApi.delete(id);
      fetchMembers();
    } catch (err) { alert('فشل الحذف'); }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const msg = encodeURIComponent(`أهلاً ${name}، يسعدنا تواجدك في Eagle Gym 🦅`);
    window.open(`https://wa.me/2${phone}?text=${msg}`, '_blank');
  };

  const getSubStatus = (member: User) => {
    const sub = member.memberSubscriptions?.[0];
    if (!sub) return null;
    return sub.status;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-0">الأعضاء</h1>
          <p className="text-dark-300 text-sm mt-1">إجمالي {total} عضو</p>
        </div>
        <button className="btn-gold" onClick={() => { setEditMember(null); setShowModal(true); }}>
          <Plus size={18} /> إضافة عضو
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-300" />
          <input
            className="input-field pr-10"
            placeholder="ابحث بالاسم أو الهاتف أو رقم العضوية..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600 bg-dark-800/50">
                <th className="table-header">العضو</th>
                <th className="table-header">الهاتف</th>
                <th className="table-header">رقم العضوية</th>
                <th className="table-header">الاشتراك</th>
                <th className="table-header">الانتهاء</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-dark-300">جارٍ التحميل...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-dark-300">لا يوجد أعضاء</td></tr>
              ) : members.map(member => {
                const sub = member.memberSubscriptions?.[0];
                const status = getSubStatus(member);
                return (
                  <tr key={member.id} className="table-row cursor-pointer" onClick={() => navigate(`/members/${member.id}`)}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-400 font-bold text-sm">{member.name.charAt(0)}</span>
                        </div>
                        <span className="font-semibold text-white">{member.name}</span>
                      </div>
                    </td>
                    <td className="table-cell" dir="ltr">{member.phone}</td>
                    <td className="table-cell">
                      <span className="badge-gold">{member.membershipNumber || '—'}</span>
                    </td>
                    <td className="table-cell text-dark-200">{sub?.subscription?.name || '—'}</td>
                    <td className="table-cell text-dark-200">
                      {sub ? new Date(sub.endDate).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="table-cell">
                      {status === 'ACTIVE' ? (
                        <span className="badge-active"><BadgeCheck size={12} /> نشط</span>
                      ) : status === 'EXPIRED' ? (
                        <span className="badge-expired"><BadgeX size={12} /> منتهي</span>
                      ) : (
                        <span className="text-dark-400 text-xs">لا يوجد</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openWhatsApp(member.phone, member.name)}
                          className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="واتساب"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          onClick={() => { setEditMember(member); setShowModal(true); }}
                          className="p-2 rounded-lg text-gold-400 hover:bg-gold-500/10 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-600">
            <p className="text-dark-300 text-sm">صفحة {page} من {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost py-1.5 px-3 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost py-1.5 px-3 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <MemberModal
          member={editMember}
          onClose={() => { setShowModal(false); setEditMember(null); }}
          onSave={fetchMembers}
        />
      )}
    </div>
  );
}
