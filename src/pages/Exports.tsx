import { useState } from 'react';
import { Download, FileText, Activity, CreditCard } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Exports() {
  const token = useAuthStore(s => s.token);
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (endpoint: string, filename: string) => {
    try {
      setLoading(endpoint);
      const res = await fetch(`http://localhost:3000/api/exports/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(null);
    }
  };

  const exportCards = [
    {
      title: 'تصدير بيانات الأعضاء',
      description: 'تحميل ملف CSV يحتوي على جميع الأعضاء وبيانات اشتراكاتهم الحالية.',
      icon: FileText,
      endpoint: 'members-csv',
      filename: 'members.csv'
    },
    {
      title: 'تصدير المدفوعات',
      description: 'تحميل ملف CSV يحتوي على سجل المدفوعات والاشتراكات لجميع الأعضاء.',
      icon: CreditCard,
      endpoint: 'payments-csv',
      filename: 'payments.csv'
    },
    {
      title: 'تصدير التمارين',
      description: 'تحميل ملف CSV يحتوي على سجل التمارين لجميع الأعضاء.',
      icon: Activity,
      endpoint: 'workouts-csv',
      filename: 'workouts.csv'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">تصدير البيانات (CSV)</h2>
        <p className="text-dark-300">قم بتحميل التقارير والبيانات بتنسيق CSV</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportCards.map(card => (
          <div key={card.endpoint} className="bg-dark-800 border border-dark-600 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mb-4">
              <card.icon size={32} className="text-gold-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
            <p className="text-dark-300 text-sm mb-6 flex-1">{card.description}</p>
            <button
              onClick={() => handleExport(card.endpoint, card.filename)}
              disabled={loading === card.endpoint}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading === card.endpoint ? (
                <div className="w-5 h-5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Download size={18} />
                  <span>تصدير CSV</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
