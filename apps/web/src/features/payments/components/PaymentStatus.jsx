import { FaCheckCircle, FaClock, FaExclamationTriangle, FaCoins, FaFileInvoiceDollar } from 'react-icons/fa';

export default function PaymentStatus({ payment }) {
  if (!payment) return null;

  const steps = [
    {
      id: 'initiated',
      label: 'Voucher Initiated',
      isComplete: true,
      icon: FaFileInvoiceDollar,
      date: payment.createdAt
    },
    {
      id: 'matched',
      label: '3-Way Match',
      isComplete: ['matched', 'resolved', 'override'].includes(payment.threeWayMatchStatus) || ['pending_approval', 'approved', 'processing', 'paid'].includes(payment.status),
      isError: payment.threeWayMatchStatus === 'discrepancy',
      icon: FaCheckCircle,
      date: payment.threeWayMatchStatus === 'matched' ? payment.updatedAt : null
    },
    {
      id: 'approved',
      label: 'Bursar Approval',
      isComplete: ['approved', 'processing', 'paid'].includes(payment.status),
      icon: FaClock,
      date: payment.approvals?.[0]?.actionDate
    },
    {
      id: 'paid',
      label: 'Disbursed & Paid',
      isComplete: payment.status === 'paid',
      icon: FaCoins,
      date: payment.paidAt
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Payment Lifecycle Progress</h4>
      <div className="relative flex items-center justify-between">
        {/* Progress connecting line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 z-0" />
        
        {steps.map((step) => {
          const Icon = step.icon;
          let circleBg = 'bg-slate-200 text-slate-400';
          if (step.isError) {
            circleBg = 'bg-red-500 text-white shadow-red-200';
          } else if (step.isComplete) {
            circleBg = 'bg-emerald-600 text-white shadow-emerald-200';
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${circleBg}`}>
                {step.isError ? <FaExclamationTriangle size={16} /> : <Icon size={16} />}
              </div>
              <span className="text-xs font-semibold text-slate-800 mt-2">{step.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {step.isError ? 'Discrepancy' : step.isComplete ? (step.date ? new Date(step.date).toLocaleDateString() : 'Completed') : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
