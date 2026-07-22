import { FaPrint, FaCheckCircle, FaBuilding, FaReceipt, FaBarcode } from 'react-icons/fa';

export default function InvoiceView({ payment }) {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const netPayable = (payment.netAmount || payment.amount) || 0;
  const totalDeductions = (payment.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <FaReceipt className="text-emerald-400" size={18} />
          <span className="font-bold text-sm">Official Payment Voucher (Treasury Form GA-T4)</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          <FaPrint size={14} />
          <span>Print Official Voucher</span>
        </button>
      </div>

      {/* Voucher Paper Document */}
      <div className="p-8 sm:p-12 space-y-8 bg-white print:p-0">
        {/* Government Header */}
        <div className="text-center border-b border-slate-300 pb-6">
          <div className="flex justify-center items-center space-x-3 mb-2">
            <FaBuilding className="text-slate-800" size={28} />
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Uva Wellassa University of Sri Lanka</h2>
              <p className="text-xs text-slate-600 font-semibold uppercase">Procurement & Finance Division — Passara Road, Badulla</p>
            </div>
          </div>
          <p className="text-sm font-black tracking-widest uppercase text-emerald-800 mt-3 underline decoration-double">
            DISBURSEMENT PAYMENT VOUCHER
          </p>
        </div>

        {/* Top Info Grid */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-2 border-r border-slate-200 pr-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Voucher Number</span>
              <span className="font-mono font-bold text-lg text-slate-900">{payment.paymentNumber}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Payee / Vendor Name</span>
              <span className="font-bold text-slate-800">{payment.vendorId?.companyName || 'Vendor'}</span>
              <p className="text-xs text-slate-500">Reg No: {payment.vendorId?.registrationNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Contract Particulars</span>
              <span className="font-medium text-slate-700">{payment.contractId?.title || 'Contract Title'}</span>
              <p className="text-xs text-slate-500 font-mono">Ref: {payment.contractId?.contractNumber}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Date & Status</span>
              <span className="font-medium text-slate-800">{new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="ml-2 inline-block text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {payment.status}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">3-Way Match Reconciled</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded inline-flex items-center space-x-1 ${
                payment.threeWayMatchStatus === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <FaCheckCircle size={10} />
                <span className="capitalize">{payment.threeWayMatchStatus}</span>
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Vote / Budget Allocation</span>
              <span className="font-mono text-xs font-semibold text-slate-700">{payment.budgetCode || 'VOTE-UWU-2026-CAPEX'}</span>
            </div>
          </div>
        </div>

        {/* 3-Way Match References */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="text-slate-400 font-bold uppercase block">Purchase Order (PO)</span>
            <span className="font-mono font-bold text-slate-800">{payment.purchaseOrder?.poNumber || 'PO-2026-N/A'}</span>
            <p className="text-[11px] text-slate-500">LKR {(payment.purchaseOrder?.poAmount || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase block">Goods Received Note (GRN)</span>
            <span className="font-mono font-bold text-slate-800">{payment.goodsReceivedNote?.grnNumber || 'GRN-2026-N/A'}</span>
            <p className="text-[11px] text-slate-500">Verified by Store Manager</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase block">Vendor Invoice</span>
            <span className="font-mono font-bold text-slate-800">{payment.invoice?.invoiceNumber || 'INV-2026-N/A'}</span>
            <p className="text-[11px] text-slate-500">LKR {(payment.invoice?.invoiceAmount || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold">
              <tr>
                <th className="px-4 py-2 text-left">Description / Particulars</th>
                <th className="px-4 py-2 text-center">Type</th>
                <th className="px-4 py-2 text-right">Gross Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{payment.contractId?.title || 'Contract Deliverable Disbursement'}</p>
                  <p className="text-slate-500 text-[11px]">Payment Type: {payment.paymentType || 'progress'}</p>
                </td>
                <td className="px-4 py-3 text-center capitalize">{payment.paymentType}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                  LKR {(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions & Net Calculation */}
        <div className="flex justify-end">
          <div className="w-full sm:w-1/2 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Gross Claim Amount</span>
              <span className="font-mono font-bold text-slate-800">LKR {(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            {(payment.deductions || []).map((d, i) => (
              <div key={i} className="flex justify-between py-1 text-red-600 border-b border-slate-100">
                <span>Less: {d.description}</span>
                <span className="font-mono font-semibold">- LKR {(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}

            {totalDeductions === 0 && (
              <div className="flex justify-between py-1 text-slate-400 italic">
                <span>Deductions (Retention/Tax)</span>
                <span>LKR 0.00</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-emerald-800">
              <span>NET AMOUNT PAYABLE</span>
              <span className="font-mono text-base">LKR {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Signatures & Certification Box */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-8">
            <p className="font-bold text-slate-700 uppercase">Prepared By</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            <p className="text-[11px] text-slate-500 font-semibold">Finance Officer / AP Clerk</p>
          </div>

          <div className="space-y-8">
            <p className="font-bold text-slate-700 uppercase">Pre-Audited By</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            <p className="text-[11px] text-slate-500 font-semibold">Internal Audit Division</p>
          </div>

          <div className="space-y-8">
            <p className="font-bold text-slate-700 uppercase">Approved For Payment</p>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
            <p className="text-[11px] text-slate-500 font-semibold">Bursar / Vice-Chancellor</p>
          </div>
        </div>

        {/* Footer Audit Barcode */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center space-x-2">
            <FaBarcode size={24} className="text-slate-700" />
            <span className="font-mono">UWU-FIN-PV-{payment.paymentNumber}</span>
          </div>
          <p>Generated automatically by UWU Smart Procurement System • System Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
