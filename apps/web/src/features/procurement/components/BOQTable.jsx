import { FaPlus, FaTrash } from 'react-icons/fa';

export default function BOQTable({ items, setItems }) {
  const addRow = () => {
    setItems([...items, { description: '', unit: '', qty: '', unitPrice: '' }]);
  };
  const removeRow = (i) => {
    setItems(items.filter((_, idx) => idx !== i));
  };
  const updateRow = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };

  const total = items.reduce((sum, r) => sum + (parseFloat(r.qty) || 0) * (parseFloat(r.unitPrice) || 0), 0);

  return (
    <div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2.5 font-semibold text-slate-600 w-8">#</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600">Description</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 w-28">Unit</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 w-24">Qty</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 w-32">Unit Price (LKR)</th>
              <th className="px-3 py-2.5 font-semibold text-slate-600 w-32">Amount (LKR)</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => {
              const amt = (parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0);
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input value={row.description} onChange={e => updateRow(i, 'description', e.target.value)} placeholder="Item description" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      <option value="">Select</option>
                      <option value="nos">Nos</option>
                      <option value="kg">Kg</option>
                      <option value="liters">Liters</option>
                      <option value="meters">Meters</option>
                      <option value="sqm">Sq.m</option>
                      <option value="lot">Lot</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={row.qty} onChange={e => updateRow(i, 'qty', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={row.unitPrice} onChange={e => updateRow(i, 'unitPrice', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">{amt.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeRow(i)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><FaTrash size={12} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={5} className="px-3 py-3 text-right font-bold text-slate-700">Total (LKR)</td>
              <td className="px-3 py-3 text-right font-bold text-emerald-700 text-base">{total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addRow} className="mt-3 inline-flex items-center space-x-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
        <FaPlus size={10} /> <span>Add Line Item</span>
      </button>
    </div>
  );
}
