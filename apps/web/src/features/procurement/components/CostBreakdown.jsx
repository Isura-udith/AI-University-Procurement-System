import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444'];

/**
 * Interactive cost breakdown with pie chart and line items.
 * @param {number} baseAmount
 * @param {number} provisionalSums
 * @param {number} contingencies
 * @param {number} vat
 * @param {number} tce - Total cost estimate
 * @param {Array} boq - Bill of quantities items
 */
export default function CostBreakdown({ baseAmount = 0, provisionalSums = 0, contingencies = 0, vat = 0, tce = 0, boq = [] }) {
  const pieData = [
    { name: 'Base Amount', value: baseAmount, color: COLORS[0] },
    { name: 'Provisional Sums', value: provisionalSums, color: COLORS[1] },
    { name: 'Contingencies', value: contingencies, color: COLORS[2] },
    { name: 'VAT (18%)', value: vat, color: COLORS[3] },
  ].filter(d => d.value > 0);

  const fmt = (n) => `LKR ${(n || 0).toLocaleString()}`;
  const pct = (n) => tce > 0 ? ((n / tce) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Chart + Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="flex items-center justify-center">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmt(value)}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">TCE</p>
              <p className="text-sm font-extrabold text-slate-800">{fmt(tce)}</p>
            </div>
          </div>
        </div>

        {/* Legend + Amounts */}
        <div className="space-y-3">
          {pieData.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{fmt(item.value)}</p>
                <p className="text-[10px] text-slate-400">{pct(item.value)}%</p>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-sm font-bold text-emerald-800">Total Cost Estimate</span>
            <span className="text-base font-extrabold text-emerald-700">{fmt(tce)}</span>
          </div>
        </div>
      </div>

      {/* BOQ Table */}
      {boq.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bill of Quantities</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-600 w-8">#</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Description</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600">Unit</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Qty</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Unit Price</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {boq.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-slate-700">{item.desc || item.description}</td>
                  <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{item.qty || item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{(item.unitPrice || item.unit_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{(item.amount || item.total || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-4 py-2.5 text-right font-bold text-slate-700">BOQ Sub-Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                  {boq.reduce((sum, item) => sum + (item.amount || item.total || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
