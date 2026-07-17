import { FaCheck, FaSpinner, FaLock, FaCircle } from 'react-icons/fa';

const STAGES = [
  { id: 1, title: 'Requirement Identification', actor: 'Requester', short: 'Planning' },
  { id: 2, title: 'Smart Requisition Intake', actor: 'Requisitioning Officer', short: 'Requisition' },
  { id: 3, title: 'Multi-Level Approval', actor: 'HOD → Dean → Bursar → Finance Com. → VC → Proc. Com.', short: 'Approval' },
  { id: 4, title: 'Financial Validation & Budget Lock', actor: 'Bursar', short: 'Budget Lock' },
  { id: 5, title: 'Strategy & Committee Routing', actor: 'Procurement Officer (PMD)', short: 'Committee' },
  { id: 6, title: 'Document Preparation & Solicitation', actor: 'Procurement Officer (PMD)', short: 'Solicitation' },
  { id: 7, title: 'Secure Digital Bidding', actor: 'Vendors', short: 'Bidding' },
  { id: 8, title: 'Public Opening & Examination', actor: 'BOC', short: 'Opening' },
  { id: 9, title: 'Technical & Financial Evaluation', actor: 'BEC', short: 'Evaluation' },
  { id: 10, title: 'Award Determination', actor: 'PC', short: 'Award' },
  { id: 11, title: 'Appeal Management', actor: 'PAC', short: 'Appeals' },
  { id: 12, title: 'Contract Finalization', actor: 'VC & Vendor', short: 'Contract' },
  { id: 13, title: 'Delivery & 3-Way Match', actor: 'AC & Stores', short: 'Delivery' },
  { id: 14, title: 'Payment & Asset Registration', actor: 'Finance', short: 'Payment' },
  { id: 15, title: 'Audit Closure & Archiving', actor: 'Auditor', short: 'Audit' },
];

function getStatusStyle(stageId, currentStage) {
  if (stageId < currentStage) return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500', label: 'Completed', icon: FaCheck };
  if (stageId === currentStage) return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-500', label: 'In Progress', icon: FaSpinner };
  return { bg: 'bg-slate-200', text: 'text-slate-400', border: 'border-slate-200', label: 'Pending', icon: FaLock };
}

export default function WorkflowTracker({ currentStage = 2, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center space-x-1 overflow-x-auto py-2">
        {STAGES.map((stage) => {
          const style = getStatusStyle(stage.id, currentStage);
          return (
            <div key={stage.id} className="flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.bg} ${style.text} text-xs font-bold shrink-0`} title={stage.title}>
                {stage.id < currentStage ? <FaCheck size={10} /> : stage.id}
              </div>
              {stage.id < 15 && (
                <div className={`w-4 h-0.5 ${stage.id < currentStage ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Procurement Lifecycle Tracker</h3>
          <p className="text-xs text-slate-500 mt-0.5">15-Stage GOSL Compliant Workflow</p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1"><FaCircle className="text-emerald-500" size={8} /> <span className="text-slate-600">Completed</span></span>
          <span className="flex items-center space-x-1"><FaCircle className="text-amber-500" size={8} /> <span className="text-slate-600">Active</span></span>
          <span className="flex items-center space-x-1"><FaCircle className="text-slate-300" size={8} /> <span className="text-slate-600">Pending</span></span>
        </div>
      </div>
      <div className="p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-1">
            {STAGES.map((stage) => {
              const style = getStatusStyle(stage.id, currentStage);
              const isActive = stage.id === currentStage;
              return (
                <div key={stage.id} className={`relative flex items-start space-x-4 py-2.5 px-3 rounded-lg transition-colors ${isActive ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50'}`}>
                  {/* Circle */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text} text-xs font-bold shadow-sm`}>
                    {stage.id < currentStage ? <FaCheck size={11} /> : stage.id}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${isActive ? 'text-amber-800' : stage.id < currentStage ? 'text-slate-700' : 'text-slate-400'}`}>
                        {stage.title}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        stage.id < currentStage ? 'bg-emerald-100 text-emerald-700' :
                        isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                      }`}>{style.label}</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                      Actor: {stage.actor}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { STAGES };
