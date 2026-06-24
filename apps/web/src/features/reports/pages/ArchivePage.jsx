import { FaArchive, FaLock } from 'react-icons/fa';
export default function ArchivePage() {
  return (
    <div className='max-w-5xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-slate-900'>Audit Closure & Tamper-Proof Archive</h1>
        <p className='text-sm text-slate-500 mt-1'>Stage 15: Cryptographically hashed decision logs, minutes, and documents for the Auditor-General.</p>
      </div>
      <div className='flex items-start space-x-3 bg-slate-100 border border-slate-200 rounded-xl px-5 py-4'>
        <FaLock className='text-slate-600 mt-0.5 shrink-0' size={16} />
        <div>
          <p className='text-sm font-semibold text-slate-800'>Tamper-Proof Storage</p>
          <p className='text-xs text-slate-600 mt-0.5'>All archived documents are cryptographically hashed. Quarterly Procurement Performance Reports are auto-generated for the National Procurement Commission.</p>
        </div>
      </div>
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center'>
        <FaArchive className='mx-auto text-slate-300 mb-3' size={40} />
        <p className='text-lg font-bold text-slate-700'>Archive is empty.</p>
        <p className='text-sm text-slate-500 mt-1'>Completed procurement cycles will be archived here.</p>
      </div>
    </div>
  );
}
