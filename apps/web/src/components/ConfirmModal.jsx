import { useState } from 'react';
import { FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa';

/**
 * Reusable confirmation modal.
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when cancelling/closing
 * @param {function} onConfirm - Called when confirming (may be async)
 * @param {string} title - Modal heading
 * @param {string} message - Body text
 * @param {string} confirmText - Confirm button label (default "Confirm")
 * @param {string} cancelText - Cancel button label (default "Cancel")
 * @param {'danger'|'warning'|'success'|'default'} variant - Colour scheme
 * @param {React.ReactNode} children - Optional custom body content (overrides message)
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  children,
}) {
  const [loading, setLoading] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch {
      /* error handled by caller */
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      btn: 'bg-red-600 hover:bg-red-500 focus:ring-red-500/30',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      btn: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/30',
    },
    success: {
      icon: 'bg-emerald-100 text-emerald-600',
      btn: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/30',
    },
    default: {
      icon: 'bg-blue-100 text-blue-600',
      btn: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/30',
    },
  };
  const v = variants[variant] || variants.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FaTimes size={12} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${v.icon}`}>
            <FaExclamationTriangle size={20} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>

          {/* Body */}
          {children || <p className="text-sm text-slate-600 leading-relaxed">{message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm focus:ring-4 disabled:opacity-70 flex items-center space-x-2 ${v.btn}`}
          >
            {loading && <FaSpinner className="animate-spin" size={12} />}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
