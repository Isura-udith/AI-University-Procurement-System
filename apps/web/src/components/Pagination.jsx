import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Reusable pagination component.
 * @param {number} currentPage - Current page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total item count
 * @param {number} itemsPerPage - Items per page
 * @param {function} onPageChange - Called with new page number
 * @param {function} onItemsPerPageChange - Called with new items per page value
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
}) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3">
      <div className="flex items-center space-x-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-700">{start}</span> to{' '}
          <span className="font-semibold text-slate-700">{end}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalItems}</span>
        </span>
        {onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronLeft size={10} />
        </button>

        {getVisiblePages()[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-8 h-8 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              1
            </button>
            {getVisiblePages()[0] > 2 && (
              <span className="text-slate-400 text-xs px-1">…</span>
            )}
          </>
        )}

        {getVisiblePages().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              page === currentPage
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {page}
          </button>
        ))}

        {getVisiblePages().slice(-1)[0] < totalPages && (
          <>
            {getVisiblePages().slice(-1)[0] < totalPages - 1 && (
              <span className="text-slate-400 text-xs px-1">…</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
