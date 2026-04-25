import { useEffect, useState } from 'react';
import { workoutsApi } from '../api/workouts';
import { WorkoutLog, Exercise } from '../types';
import { ArrowRight, Play, Scale, LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProgramItem {
  id: string;
  exercise: Exercise;
  dayName: string;
  setsCount: number;
}

export default function MemberWorkouts() {
  const [program, setProgram] = useState<ProgramItem[]>([]);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [progData, histData] = await Promise.all([
        workoutsApi.getProgram('me'), // Assuming 'me' or just getProgram() handles auth
        workoutsApi.getHistory()
      ]);
      setProgram(progData);
      setHistory(histData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Group program by dayName
  const groupedProgram: Record<string, ProgramItem[]> = program.reduce((acc, item) => {
    const day = item.dayName || 'عام';
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, ProgramItem[]>);

  // Helper to get last 4 performances for an exercise
  const getExerciseHistory = (exerciseId: string) => {
    const performances: { weight: number, reps: number, date: string, logId: string, setId: string }[] = [];
    
    // Iterate through history to find sets for this exercise
    // We want the last 4 unique dates
    const datesProcessed = new Set();
    for (const log of history) {
      const set = log.workoutSets.find(s => s.exerciseId === exerciseId);
      if (set && !datesProcessed.has(log.date.split('T')[0])) {
        performances.push({
          weight: set.weight,
          reps: set.reps,
          date: log.date,
          logId: log.id,
          setId: set.id
        });
        datesProcessed.add(log.date.split('T')[0]);
        if (performances.length >= 4) break;
      }
    }
    
    // Reverse to show oldest to newest (Session 1 to 4)
    return performances.reverse();
  };

  const handleQuickLog = async (exerciseId: string, sessionIndex: number, currentWeight: number, currentReps: number) => {
    // This is a bit complex because we need to know IF we are updating an old session or adding a new one
    // For simplicity in this "Sheet" view, we'll assume the user is logging "Today's" performance for this slot
    setSaving(`${exerciseId}-${sessionIndex}`);
    try {
      // 1. Get or Create Today's Log
      const todayLog = await workoutsApi.getTodayLog();
      // 2. Find if set exists in today's log
      const existingSet = todayLog.workoutSets.find(s => s.exerciseId === exerciseId);
      
      if (existingSet) {
        await workoutsApi.updateSet(existingSet.id, { weight: currentWeight, reps: currentReps });
      } else {
        await workoutsApi.addSet(todayLog.id, {
          exerciseId,
          setNumber: 1, // Default to set 1 for this sheet view
          weight: currentWeight,
          reps: currentReps
        });
      }
      // Refresh
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">جاري تحميل جداولك...</div>;

  return (
    <div className="space-y-6 pb-20 animate-fade-in rtl" dir="rtl">
      <div className="flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-2 text-dark-300 hover:text-gold-400 transition-colors text-sm">
          <ArrowRight size={16} /> العودة للرئيسية
        </Link>
        <div className="text-left">
          <p className="text-dark-400 text-[10px] uppercase tracking-wider">بطاقات التدريب</p>
          <p className="text-white font-bold">برنامجك التدريبي</p>
        </div>
      </div>

      {Object.entries(groupedProgram).map(([dayName, exercises]) => (
        <div key={dayName} className="card border-dark-600/50 p-0 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gold-500/10 border-b border-gold-500/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500 text-dark-900 flex items-center justify-center">
                <LayoutGrid size={18} />
              </div>
              <h2 className="text-lg font-black text-white">{dayName}</h2>
            </div>
            <span className="text-gold-500/60 text-[10px] font-bold uppercase">{exercises.length} تمارين</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-dark-900/50 text-[10px] text-dark-400 border-b border-dark-700">
                  <th className="p-3 font-bold text-dark-200 sticky right-0 bg-dark-800 z-10 w-40">التمرين</th>
                  <th className="p-3 text-center border-r border-dark-700">الأسبوع 1</th>
                  <th className="p-3 text-center border-r border-dark-700">الأسبوع 2</th>
                  <th className="p-3 text-center border-r border-dark-700">الأسبوع 3</th>
                  <th className="p-3 text-center border-r border-dark-700 bg-gold-500/5 text-gold-400">الأسبوع 4 (الحالي)</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((item) => {
                  const exerciseHist = getExerciseHistory(item.exercise.id);
                  return (
                    <tr key={item.id} className="border-b border-dark-700/50 hover:bg-dark-700/20 transition-colors">
                      <td className="p-3 sticky right-0 bg-dark-800 z-10 border-l border-dark-700">
                        <p className="text-white text-xs font-bold truncate">{item.exercise.name}</p>
                        <p className="text-dark-500 text-[9px]">{item.setsCount} مجموعات</p>
                      </td>
                      
                      {[0, 1, 2, 3].map((idx) => {
                        const perf = exerciseHist[idx];
                        const isToday = idx === 3;
                        return (
                          <td key={idx} className={`p-2 border-r border-dark-700/50 min-w-[100px] ${isToday ? 'bg-gold-500/5' : ''}`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  placeholder="كغ"
                                  defaultValue={perf?.weight || ''}
                                  onBlur={(e) => isToday && handleQuickLog(item.exercise.id, idx, parseFloat(e.target.value), perf?.reps || 0)}
                                  className={`w-full bg-dark-900 border ${isToday ? 'border-gold-500/30 focus:border-gold-500' : 'border-dark-600 opacity-60'} rounded px-1.5 py-1 text-white text-center text-xs font-bold outline-none`}
                                />
                                <input 
                                  type="number" 
                                  placeholder="عدات"
                                  defaultValue={perf?.reps || ''}
                                  onBlur={(e) => isToday && handleQuickLog(item.exercise.id, idx, perf?.weight || 0, parseInt(e.target.value))}
                                  className={`w-full bg-dark-900 border ${isToday ? 'border-gold-500/30 focus:border-gold-500' : 'border-dark-600 opacity-60'} rounded px-1.5 py-1 text-white text-center text-xs font-bold outline-none`}
                                />
                              </div>
                              {perf?.date && (
                                <p className="text-[8px] text-dark-500 text-center">
                                  {new Date(perf.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                </p>
                              )}
                              {saving === `${item.exercise.id}-${idx}` && (
                                <div className="h-0.5 bg-gold-500 animate-loading-bar rounded-full mt-1" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card bg-emerald-500/5 border-emerald-500/20 p-4">
        <div className="flex items-center gap-3">
          <Scale className="text-emerald-500" size={20} />
          <p className="text-emerald-400 text-[10px] leading-relaxed">
             هذه الجداول مصممة لتتبع تقدمك الأسبوعي. الحصة 4 هي الحصة الحالية، بينما الحصص 1-3 تعرض تاريخك السابق للمقارنة والتحفيز.
          </p>
        </div>
      </div>
    </div>
  );
}

