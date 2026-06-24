import { useState } from 'react';
import { FaDownload, FaFileCsv, FaFilePdf, FaChevronDown } from 'react-icons/fa';

/**
 * Export button with CSV and PDF options dropdown.
 * @param {function} onExportCSV - Handler for CSV export
 * @param {function} onExportPDF - Handler for PDF export (optional)
 * @param {Array} data - Data array to export
 * @param {string} filename - Base filename (no extension)
 * @param {Array} columns - Column definitions [{key, label}]
 */
export default function ExportButton({ onExportCSV, onExportPDF, data = [], filename = 'export', columns = [] }) {
  const [open, setOpen] = useState(false);

  const handleCSV = () => {
    if (onExportCSV) {
      onExportCSV();
    } else if (data.length > 0 && columns.length > 0) {
      const header = columns.map(c => c.label).join(',');
      const rows = data.map(row =>
        columns.map(c => {
          const val = row[c.key];
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setOpen(false);
  };

  const handlePDF = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      window.print();
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
      >
        <FaDownload size={11} />
        <span>Export</span>
        <FaChevronDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px] animate-scale-in">
            <button
              onClick={handleCSV}
              className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FaFileCsv className="text-emerald-600" size={14} />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={handlePDF}
              className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FaFilePdf className="text-red-500" size={14} />
              <span>Print / PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
