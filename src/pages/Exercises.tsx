import { useEffect, useState } from 'react';
import { Dumbbell, Plus, Play, Trash2, Search, Video } from 'lucide-react';
import { Exercise } from '../types';
import { workoutsApi } from '../api/workouts';

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', muscleGroup: '', videoUrl: '' });

  const fetchExercises = async () => {
    try {
      const data = await workoutsApi.getExercises();
      setExercises(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExercises(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await workoutsApi.createExercise(newEx);
      setShowModal(false);
      setNewEx({ name: '', muscleGroup: '', videoUrl: '' });
      fetchExercises();
    } catch (err) {
      console.error(err);
      alert('خطأ في إضافة التمرين');
    }
  };

  const filtered = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">دليل التمارين</h1>
          <p className="text-dark-300">إدارة قائمة التمارين والروابط التعليمية</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gold">
          <Plus size={20} /> إضافة تمرين جديد
        </button>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
          <input
            type="text"
            placeholder="البحث عن تمرين أو عضلة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-dark-800/50" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-20 text-dark-400">لا يوجد تمارين تطابق بحثك</div>
        ) : (
          filtered.map(ex => (
            <div key={ex.id} className="card group hover:border-gold-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
                  <Dumbbell size={24} />
                </div>
                {ex.videoUrl && (
                  <a 
                    href={ex.videoUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="مشاهدة الفيديو"
                  >
                    <Play size={16} fill="currentColor" />
                  </a>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{ex.name}</h3>
              <p className="text-dark-300 text-sm">{ex.muscleGroup || 'عضلة غير محددة'}</p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <h2 className="text-2xl font-black text-white mb-6">إضافة تمرين جديد</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">اسم التمرين</label>
                <input
                  required
                  type="text"
                  value={newEx.name}
                  onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: بنش برس"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">العضلة المستهدفة</label>
                <input
                  type="text"
                  value={newEx.muscleGroup}
                  onChange={(e) => setNewEx({ ...newEx, muscleGroup: e.target.value })}
                  className="input-field"
                  placeholder="مثال: صدر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1 flex items-center gap-2">
                  رابط فيديو تعليمي (YouTube) <Video size={14} className="text-red-500" />
                </label>
                <input
                  type="url"
                  value={newEx.videoUrl}
                  onChange={(e) => setNewEx({ ...newEx, videoUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">إلغاء</button>
                <button type="submit" className="btn-gold flex-1">إضافة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
