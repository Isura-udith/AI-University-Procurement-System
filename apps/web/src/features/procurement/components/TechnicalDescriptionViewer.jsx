import { useState } from 'react';
import { FaCheckCircle, FaMicrochip, FaExternalLinkAlt } from 'react-icons/fa';


/**
 * Parses raw text into structured key-value specifications and list points
 */
function parseOverviewText(text) {
  if (!text || typeof text !== 'string') return { keyValues: [], paragraphs: [], bullets: [] };

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const keyValues = [];
  const bullets = [];
  const paragraphs = [];

  lines.forEach(line => {
    // Key-value pair like "Processor: Intel i7" or "Storage = 512GB"
    const kvMatch = line.match(/^([^:-]{2,35})[:=]\s*(.+)$/);
    if (kvMatch && !line.startsWith('http')) {
      keyValues.push({ label: kvMatch[1].trim(), value: kvMatch[2].trim() });
    } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      bullets.push(line.replace(/^[•\-*]\s*/, '').trim());
    } else {
      paragraphs.push(line);
    }
  });

  return { keyValues, bullets, paragraphs };
}

export default function TechnicalDescriptionViewer({
  description,
  technicalSpecifications = [],
  items = [],
  onViewItem
}) {
  const hasTechSpecs = technicalSpecifications && technicalSpecifications.length > 0;
  const hasBoqSpecs = items && items.some(it => (it.specifications || it.specs)?.trim());

  const [selectedTab, setSelectedTab] = useState(null);

  // Derive active tab based on user selection or defaults (specs if available, else overview)
  let activeTab = selectedTab;
  if (!activeTab || (activeTab === 'specs' && !hasTechSpecs) || (activeTab === 'boq_specs' && !hasBoqSpecs)) {
    activeTab = hasTechSpecs ? 'specs' : 'overview';
  }

  const { keyValues, bullets, paragraphs } = parseOverviewText(description);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
            <FaMicrochip size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Technical Description & Specifications
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Government procurement standard compliant technical requirements</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasTechSpecs && (
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
              {technicalSpecifications.length} Criteria
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs if multiple sections exist - Technical Criteria default & first */}
      {(hasTechSpecs || hasBoqSpecs) && (
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 text-xs font-semibold">
          {hasTechSpecs && (
            <button
              onClick={() => setSelectedTab('specs')}
              className={`py-2.5 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'specs'
                  ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Technical Criteria ({technicalSpecifications.length})</span>
            </button>
          )}

          <button
            onClick={() => setSelectedTab('overview')}
            className={`py-2.5 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Overview & Parameters</span>
          </button>

          {hasBoqSpecs && (
            <button
              onClick={() => setSelectedTab('boq_specs')}
              className={`py-2.5 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'boq_specs'
                  ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Itemized Specs ({items.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Body Content */}
      <div className="p-6">
        {/* TAB 1: OVERVIEW & KEY PARAMETERS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Raw / Paragraph Text */}
            {paragraphs.length > 0 && (
              <div className="space-y-3">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed font-normal">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {/* Key-Value Structured Grid Cards */}
            {keyValues.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Technical Specifications Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {keyValues.map((kv, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-emerald-300 transition-colors">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{kv.label}</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{kv.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bullet points */}
            {bullets.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Requirements Checklist</h4>
                <ul className="space-y-2">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                      <FaCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={12} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!description && !keyValues.length && !paragraphs.length && (
              <p className="text-sm text-slate-400 italic">No general technical description provided.</p>
            )}
          </div>
        )}

        {/* TAB 2: TECHNICAL SPECIFICATIONS (FOR VENDOR COMPLIANCE) */}
        {activeTab === 'specs' && hasTechSpecs && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                These defined criteria will be used during evaluation to score vendor proposals.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {technicalSpecifications.map((spec, i) => {
                const isMandatory = spec.isMandatory !== false;
                const priority = spec.priority || 'required';

                return (
                  <div key={i} className="bg-white p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {spec.specNumber || i + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <h4 className="text-sm font-bold text-slate-800">{spec.title}</h4>
                            {isMandatory ? (
                              <span className="text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                MANDATORY
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                OPTIONAL
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded capitalize">
                              {priority} Priority
                            </span>
                          </div>
                          {spec.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                              {spec.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BOQ LINE ITEMS TECHNICAL SPECS */}
        {activeTab === 'boq_specs' && hasBoqSpecs && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Technical specifications breakdown for individual line items in this requisition.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((it, idx) => {
                const specText = it.specifications || it.specs || '';
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-emerald-400 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Item #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Qty: {it.quantity || it.qty || 1} {it.unit || 'nos'}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-800 line-clamp-1">{it.description || it.desc}</h5>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                        {specText || 'No detailed specifications string provided.'}
                      </p>
                    </div>

                    {onViewItem && (
                      <button
                        onClick={() => onViewItem(it, idx)}
                        className="mt-3 w-full py-1.5 px-3 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1"
                      >
                        <FaExternalLinkAlt size={10} />
                        <span>View Full Specs</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
