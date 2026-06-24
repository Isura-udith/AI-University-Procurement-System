import { Link } from 'react-router-dom';
import { FaEye, FaExclamationCircle } from 'react-icons/fa';
import StatusBadge from '../../../components/StatusBadge';

/**
 * Compact card view for procurement requests.
 * @param {object} item - Procurement item data
 * @param {function} onDelete - Optional delete handler
 */
export default function RequestCard({ item, onDelete }) {
  if (!item) return null;

  const priorityColors = {
    urgent: 'border-l-red-500 bg-red-50/30',
    high: 'border-l-amber-500 bg-amber-50/20',
    normal: 'border-l-emerald-500 bg-white',
  };

  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all border-l-4 ${priorityColors[item.priority] || priorityColors.normal}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.id}</span>
              {item.priority === 'urgent' && (
                <span className="flex items-center space-x-1 text-[10px] font-bold text-red-600">
                  <FaExclamationCircle size={8} />
                  <span>URGENT</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800 truncate">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{item.faculty} • {item.officer}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-3">
            <StatusBadge status={item.status} size="xs" />
            <span className="text-xs font-bold text-slate-700">
              LKR {(item.tce || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* Stage dots */}
            <div className="flex items-center space-x-0.5">
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i < (item.stage || 0) ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="text-[9px] text-slate-400 ml-1">{item.stage || 0}/15</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">{item.date}</span>
          <div className="flex items-center space-x-2">
            {onDelete && (
              <button
                onClick={(e) => { e.preventDefault(); onDelete(item); }}
                className="text-[10px] text-red-400 hover:text-red-600 font-medium transition-colors"
              >
                Delete
              </button>
            )}
            <Link
              to={`/procurements/${item.id}`}
              className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <FaEye size={10} />
              <span>View</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
