import { FaTimes, FaInfoCircle, FaClipboardList, FaCheckCircle } from 'react-icons/fa';

/**
 * Parses specifications string into structured key-value specs or bullet points
 */
function parseSpecifications(specStr) {
  if (!specStr || typeof specStr !== 'string') return { keyValues: [], bullets: [], raw: '' };

  const lines = specStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const keyValues = [];
  const bullets = [];
  const raw = specStr;

  lines.forEach(line => {
    // Check if line is key: value or key = value
    const match = line.match(/^([^:-]{2,35})[:=]\s*(.+)$/);
    if (match && !line.startsWith('http')) {
      keyValues.push({ label: match[1].trim(), value: match[2].trim() });
    } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      bullets.push(line.replace(/^[•\-*]\s*/, '').trim());
    } else {
      // Split by comma if looks like parameter list
      if (line.includes(',') && line.includes(':')) {
        const parts = line.split(',');
        parts.forEach(p => {
          const pm = p.match(/^([^:-]{2,25})[:=]\s*(.+)$/);
          if (pm) keyValues.push({ label: pm[1].trim(), value: pm[2].trim() });
          else bullets.push(p.trim());
        });
      } else {
        bullets.push(line);
      }
    }
  });

  return { keyValues, bullets, raw };
}

export default function ItemDetailsModal({ isOpen, onClose, item, itemIndex }) {
  if (!isOpen || !item) return null;

  const desc = item.description || item.desc || 'Line Item';
  const rawSpecs = item.specifications || item.specs || item.technicalDescription || '';
  const unit = item.unit || 'nos';
  const qty = item.quantity !== undefined ? item.quantity : (item.qty || 1);
  const unitPrice = item.estimatedUnitPrice !== undefined ? item.estimatedUnitPrice : (item.unitPrice || 0);
  const totalPrice = item.estimatedTotalPrice !== undefined ? item.estimatedTotalPrice : (item.amount || (qty * unitPrice));

  const { keyValues, bullets, raw } = parseSpecifications(rawSpecs);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-scale-up">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              #{itemIndex !== undefined ? itemIndex + 1 : '1'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                  Item Detail Specs
                </span>
                <span className="text-xs text-slate-300">Unit: {unit}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5 line-clamp-1">{desc}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Financial Summary Strip */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Quantity</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{qty} <span className="text-xs font-normal text-slate-500">{unit}</span></p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Unit Price</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">LKR {(unitPrice || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">Total Estimated Cost</p>
              <p className="text-base font-extrabold text-emerald-700 mt-0.5">LKR {(totalPrice || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Technical Specifications Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FaClipboardList className="text-emerald-600" size={13} />
                Technical Specifications & Requirements
              </h4>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200 flex items-center gap-1">
                <FaCheckCircle size={10} /> Brand Neutral Compliant
              </span>
            </div>

            {keyValues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {keyValues.map((kv, i) => (
                  <div key={i} className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg p-2.5 transition-colors">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{kv.label}</p>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">{kv.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {bullets.length > 0 ? (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-slate-700">Detailed Criteria & Standards:</p>
                <ul className="space-y-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start text-xs text-slate-700 space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!keyValues.length && !bullets.length && raw ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                {raw}
              </div>
            ) : null}

            {!raw && (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No specific technical parameters provided for this line item.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <FaInfoCircle size={11} className="text-slate-400" /> Verify specifications before procurement approval
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
