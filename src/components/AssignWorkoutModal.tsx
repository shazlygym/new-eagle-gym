import { useState } from 'react';
import { workoutsApi } from '../api/workouts';
import { Exercise } from '../types';

interface Props {
  userId: string;
  memberName: string;
  exercises: Exercise[];
  onClose: () => void;
  onSave: () => void;
}

export default function AssignWorkoutModal({ userId, memberName, exercises, onClose, onSave }: Props) {
  const [selectedExercise, setSelectedExercise] = useState('');
  const [dayName, setDayName] = useState('اليوم الأول');
  const [setsCount, setSetsCount] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedExercise) return;
    setLoading(true);
    try {
      await workoutsApi.addToProgram({
        userId,
        exerciseId: selectedExercise,
        dayName: dayName,
        setsCount: setsCount,
      });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('خطأ في إضافة التمرين للبرنامج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/80 backdrop-blur-sm">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
        <h2 className="text-2xl font-black text-white mb-2">تخصيص تمرين للبرنامج</h2>
        <p className="text-dark-300 text-sm mb-6">للعضو: {memberName}</p>

        <div className="space-y-4">
          <div>
            <label className="label">اسم الجدول (مثلاً: صدر، ظهر، اليوم 1)</label>
            <input 
              type="text" 
              value={dayName} 
              onChange={(e) => setDayName(e.target.value)}
              className="input-field"
              placeholder="مثلاً: تمارين الصدر"
            />
          </div>

          <div>
            <label className="label">اختر التمرين</label>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="input-field"
            >
              <option value="">-- اختر من القائمة --</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscleGroup || 'عام'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">عدد المجموعات لهذا التمرين</label>
            <input 
              type="number" 
              value={setsCount} 
              onChange={(e) => setSetsCount(parseInt(e.target.value))}
              className="input-field"
              min="1"
              max="10"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-ghost flex-1">إلغاء</button>
            <button 
              onClick={handleSave} 
              disabled={loading || !selectedExercise}
              className="btn-gold flex-1"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ في البرنامج'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
