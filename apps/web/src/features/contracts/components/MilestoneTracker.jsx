import { FaCheckCircle, FaClock, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

/**
 * Visual milestone timeline with status indicators.
 * @param {Array} milestones - [{title, dueDate, status, completedDate, amount, deliverables}]
 * @param {function} onComplete - Called with milestone index when marking complete
 * @param {boolean} editable - Whether the milestone can be actioned
 */
export default function MilestoneTracker({ milestones = [], onComplete, editable = false }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No milestones defined.</p>;
  }

  const getStatusConfig = (ms) => {
    const now = new Date();
    const due = new Date(ms.dueDate);
    if (ms.status === 'completed') return { icon: FaCheckCircle, color: 'bg-emerald-500', text: 'text-emerald-700', label: 'Completed', line: 'bg-emerald-400' };
    if (ms.status === 'in-progress') return { icon: FaSpinner, color: 'bg-blue-500', text: 'text-blue-700', label: 'In Progress', line: 'bg-blue-400' };
    if (due < now) return { icon: FaExclamationTriangle, color: 'bg-red-500', text: 'text-red-700', label: 'Overdue', line: 'bg-red-400' };
    return { icon: FaClock, color: 'bg-slate-300', text: 'text-slate-500', label: 'Pending', line: 'bg-slate-200' };
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="flex-1 bg-slate-100 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-600">{completedCount}/{milestones.length}</span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {milestones.map((ms, i) => {
          const config = getStatusConfig(ms);
          const isLast = i === milestones.length - 1;
          const Icon = config.icon;

          return (
            <div key={i} className="relative flex items-start">
              {/* Timeline column */}
              <div className="flex flex-col items-center shrink-0 mr-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${config.color}`}>
                  <Icon size={12} className={ms.status === 'in-progress' ? 'animate-spin' : ''} />
                </div>
                {!isLast && <div className={`w-0.5 h-16 ${config.line} mt-1`} />}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${!isLast ? 'mb-2' : ''}`}>
                <div className={`p-3 rounded-lg border transition-all ${
                  ms.status === 'completed' ? 'border-emerald-200 bg-emerald-50/50' :
                  config.label === 'Overdue' ? 'border-red-200 bg-red-50/50' :
                  ms.status === 'in-progress' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{ms.title}</p>
                      <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center space-x-1"><FaClock size={9} /><span>Due: {ms.dueDate}</span></span>
                        {ms.amount && <span>LKR {ms.amount.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
                      {ms.completedDate && <p className="text-[10px] text-slate-400">{ms.completedDate}</p>}
                    </div>
                  </div>

                  {ms.deliverables && ms.deliverables.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Deliverables</p>
                      <div className="flex flex-wrap gap-1">
                        {ms.deliverables.map((d, j) => (
                          <span key={j} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {editable && ms.status !== 'completed' && (
                    <button
                      onClick={() => onComplete?.(i)}
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center space-x-1"
                    >
                      <FaCheckCircle size={10} /><span>Mark Complete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
