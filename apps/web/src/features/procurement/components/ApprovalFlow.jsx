import { FaCheckCircle, FaClock, FaTimes, FaCheck, FaArrowRight } from 'react-icons/fa';

/**
 * Visual approval chain flow diagram with step-by-step status.
 * @param {Array} approvals - [{role, name, status, date, comments}]
 * @param {function} onApprove - Called with approval index
 * @param {function} onReject - Called with approval index
 * @param {boolean} canAct - Whether the current user can approve/reject
 * @param {number} activeIndex - Which approval is currently actionable (-1 if none)
 */
export default function ApprovalFlow({ approvals = [], onApprove, onReject, canAct = false, activeIndex = -1 }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return { icon: FaCheckCircle, bg: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', label: 'Approved', line: 'bg-emerald-400' };
      case 'rejected':
        return { icon: FaTimes, bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700', label: 'Rejected', line: 'bg-red-400' };
      case 'pending':
      default:
        return { icon: FaClock, bg: 'bg-slate-300', ring: 'ring-slate-100', text: 'text-amber-600', label: 'Pending', line: 'bg-slate-200' };
    }
  };

  return (
    <div className="space-y-0">
      {approvals.map((approval, i) => {
        const config = getStatusConfig(approval.status);
        const isActive = i === activeIndex;
        const isLast = i === approvals.length - 1;
        const Icon = config.icon;

        return (
          <div key={i} className="relative">
            <div className="flex items-start space-x-4">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ${config.bg} ${config.ring} ${
                    isActive ? 'animate-pulse-ring' : ''
                  }`}
                >
                  <Icon size={14} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-12 ${config.line} mt-1`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${!isLast ? 'mb-2' : ''}`}>
                <div className={`p-4 rounded-xl border transition-all ${
                  isActive ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' :
                  approval.status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' :
                  approval.status === 'rejected' ? 'border-red-200 bg-red-50/30' :
                  'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{approval.role}</p>
                      <p className="text-xs text-slate-500">{approval.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
                      {approval.date && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{approval.date}</p>
                      )}
                    </div>
                  </div>

                  {approval.comments && (
                    <p className="text-xs text-slate-500 mt-2 italic border-t border-slate-100 pt-2">
                      "{approval.comments}"
                    </p>
                  )}



                  {/* Action buttons for active approval */}
                  {isActive && canAct && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => onApprove?.(i)}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors"
                      >
                        <FaCheck size={10} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => onReject?.(i)}
                        className="px-4 py-2 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Return
                      </button>
                    </div>
                  )}
                </div>

                {/* Arrow connector */}
                {!isLast && approval.status === 'approved' && (
                  <div className="flex justify-center mt-1">
                    <FaArrowRight className="text-emerald-400" size={10} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
