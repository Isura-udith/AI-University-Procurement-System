import { FaCheck, FaSpinner,  FaCircle, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useState } from 'react';

/**
 * 8-Phase, 45-Step Procurement Workflow Tracker
 * Maps the complete university procurement lifecycle.
 */

const PHASES = [
  { id: 1, title: 'Strategic Planning', subtitle: '3-Year Master Procurement Plan', color: 'violet', steps: [
    { step: 1,  title: 'Department Division (HOD)',          actor: 'HOD' },
    { step: 2,  title: 'Identify 3-Year Requirements',       actor: 'HOD' },
    { step: 3,  title: 'Faculty Dean Review',                actor: 'Dean' },
    { step: 4,  title: 'Bursar Cost Estimation',             actor: 'Bursar' },
    { step: 5,  title: 'Finance Committee Review',           actor: 'Finance Committee' },
    { step: 6,  title: 'Vice Chancellor Approval',           actor: 'Vice Chancellor' },
    { step: 7,  title: 'Council Approval',                   actor: 'Council' },
    { step: 8,  title: '3-Year Master Plan Active',          actor: 'System' },
  ]},
  { id: 2, title: 'Annual Planning', subtitle: 'Divide into Annual Plans', color: 'blue', steps: [
    { step: 9,  title: 'Divide into Annual Plans',           actor: 'Procurement Officer' },
    { step: 10, title: 'Item Budget Preparation',            actor: 'Procurement Officer' },
    { step: 11, title: 'Annual Budget Plan',                 actor: 'Procurement Officer' },
  ]},
  { id: 3, title: 'Budget Approval', subtitle: 'Internal + External Approval Chain', color: 'amber', steps: [
    { step: 12, title: 'Faculty Dean Approval',              actor: 'Dean' },
    { step: 13, title: 'Bursar Review',                      actor: 'Bursar' },
    { step: 14, title: 'Finance Committee Review',           actor: 'Finance Committee' },
    { step: 15, title: 'Vice Chancellor Approval',           actor: 'Vice Chancellor' },
    { step: 16, title: 'Council Approval',                   actor: 'Council' },
    { step: 17, title: 'UGC Review',                         actor: 'UGC' },
    { step: 18, title: 'Treasury Review',                    actor: 'Treasury' },
    { step: 19, title: 'Parliament Approval',                actor: 'Parliament' },
    { step: 20, title: 'Budget Allocation to University',    actor: 'Government' },
  ]},
  { id: 4, title: 'Budget Distribution', subtitle: 'Internal Fund Allocation', color: 'emerald', steps: [
    { step: 21, title: 'University Receives Budget',         actor: 'Bursar' },
    { step: 22, title: 'Vice Chancellor Distribution',       actor: 'Vice Chancellor' },
    { step: 23, title: 'Finance Committee Allocation',       actor: 'Finance Committee' },
    { step: 24, title: 'Bursar Distribution',                actor: 'Bursar' },
    { step: 25, title: 'Faculty Dean Allocation',            actor: 'Dean' },
    { step: 26, title: 'Department HOD Receives Budget',     actor: 'HOD' },
  ]},
  { id: 5, title: 'Procurement Request', subtitle: 'Create & Approve Requisitions', color: 'cyan', steps: [
    { step: 27, title: 'Department User Creates Request',    actor: 'Department User' },
    { step: 28, title: 'Department Head (HOD) Review',       actor: 'HOD' },
    { step: 29, title: 'Value-Based Approval Routing',       actor: 'Dean / VC / Committee' },
  ]},
  { id: 6, title: 'Tender & Supplier', subtitle: 'Bidding, Evaluation & Award', color: 'indigo', steps: [
    { step: 30, title: 'Procurement Committee Review',       actor: 'Procurement Committee' },
    { step: 31, title: 'Publish Tender',                     actor: 'Procurement Officer' },
    { step: 32, title: 'Suppliers Submit Bids',              actor: 'Suppliers' },
    { step: 33, title: 'Technical Evaluation (TEC)',         actor: 'TEC' },
    { step: 34, title: 'Bid Evaluation',                     actor: 'BEC' },
    { step: 35, title: 'Supplier Selection',                 actor: 'Procurement Committee' },
    { step: 36, title: 'Award Contract',                     actor: 'VC' },
  ]},
  { id: 7, title: 'Purchasing & Receiving', subtitle: 'Delivery, Inspection & Store', color: 'orange', steps: [
    { step: 37, title: 'Supplier Delivers Goods',            actor: 'Supplier' },
    { step: 38, title: 'Supplies Dept. Receives',            actor: 'Store Manager' },
    { step: 39, title: 'Store Acceptance',                   actor: 'Store Manager' },
    { step: 40, title: 'Goods Inspection',                   actor: 'Inspector' },
    { step: 41, title: 'Inventory Update',                   actor: 'System' },
  ]},
  { id: 8, title: 'Distribution', subtitle: 'Issue to Departments', color: 'rose', steps: [
    { step: 42, title: 'Department Requests Items',          actor: 'Department User' },
    { step: 43, title: 'Store Issues Items',                 actor: 'Store Manager' },
    { step: 44, title: 'Department Receives Items',          actor: 'Department User' },
    { step: 45, title: 'Procurement Completed',              actor: 'System' },
  ]},
];

const COLOR_MAP = {
  violet:  { bg: 'bg-violet-500',  light: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700' },
  blue:    { bg: 'bg-blue-500',    light: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  cyan:    { bg: 'bg-cyan-500',    light: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700' },
  indigo:  { bg: 'bg-indigo-500',  light: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700' },
  orange:  { bg: 'bg-orange-500',  light: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700' },
  rose:    { bg: 'bg-rose-500',    light: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700' },
};

function getStepStatus(stepNumber, currentStep) {
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'active';
  return 'pending';
}

/**
 * Compact mode: horizontal phase dots with tooltips.
 * Full mode: expandable accordion with all 45 steps.
 */
export default function ProcurementWorkflowTracker({ currentStep = 1, compact = false }) {
  const [expandedPhase, setExpandedPhase] = useState(null);

  const togglePhase = (id) => {
    setExpandedPhase(prev => prev === id ? null : id);
  };

  const completedSteps = Math.min(currentStep - 1, 45);
  const progress = Math.round((completedSteps / 45) * 100);

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lifecycle Progress</span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              Step {Math.min(currentStep, 45)}/45
            </span>
          </div>
          <span className="text-xs font-bold text-slate-600">{progress}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-linear-to-r from-violet-500 via-blue-500 to-rose-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        {/* Phase dots */}
        <div className="flex items-center justify-between"> 
          {PHASES.map((phase) => {
            const firstStep = phase.steps[0].step;
            const lastStep = phase.steps[phase.steps.length - 1].step;
            const isComplete = currentStep > lastStep;
            const isActive = currentStep >= firstStep && currentStep <= lastStep;
            const c = COLOR_MAP[phase.color];
            return (
              <div key={phase.id} className="flex flex-col items-center gap-1 group relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete ? `${c.bg} text-white shadow-sm` :
                  isActive ? `${c.bg} text-white shadow-md ring-2 ring-offset-2 ring-${phase.color}-300 animate-pulse` :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {isComplete ? <FaCheck size={10} /> : phase.id}
                </div>
                <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? c.text : isComplete ? 'text-slate-600' : 'text-slate-400'}`}>
                  {phase.title.split(' ')[0]}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                    Phase {phase.id}: {phase.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Full Expanded Mode ──────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Procurement Lifecycle Tracker</h3>
            <p className="text-xs text-slate-500 mt-0.5">45-Step Workflow · 8 Phases</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center space-x-1"><FaCircle className="text-emerald-500" size={8} /> <span className="text-slate-600">Done</span></span>
              <span className="flex items-center space-x-1"><FaCircle className="text-amber-500" size={8} /> <span className="text-slate-600">Active</span></span>
              <span className="flex items-center space-x-1"><FaCircle className="text-slate-300" size={8} /> <span className="text-slate-600">Pending</span></span>
            </div>
            <div className="bg-slate-100 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-slate-700">{progress}% Complete</span>
            </div>
          </div>
        </div>
        {/* Global progress bar */}
        <div className="mt-3 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-linear-to-r from-violet-500 via-indigo-500 to-rose-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Phases Accordion */}
      <div className="divide-y divide-slate-100">
        {PHASES.map((phase) => {
          const c = COLOR_MAP[phase.color];
          const firstStep = phase.steps[0].step;
          const lastStep = phase.steps[phase.steps.length - 1].step;
          const totalPhaseSteps = phase.steps.length;
          const completedInPhase = phase.steps.filter(s => s.step < currentStep).length;
          const isPhaseComplete = currentStep > lastStep;
          const isPhaseActive = currentStep >= firstStep && currentStep <= lastStep;
          const phaseProgress = isPhaseComplete ? 100 : Math.round((completedInPhase / totalPhaseSteps) * 100);
          const isExpanded = expandedPhase === phase.id || (expandedPhase === null && isPhaseActive);

          return (
            <div key={phase.id}>
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={`w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors ${isPhaseActive ? `${c.light}` : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ${
                    isPhaseComplete ? 'bg-emerald-500' : isPhaseActive ? c.bg : 'bg-slate-300'
                  }`}>
                    {isPhaseComplete ? <FaCheck size={14} /> : phase.id}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isPhaseActive ? c.text : isPhaseComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                        Phase {phase.id}: {phase.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isPhaseComplete ? 'bg-emerald-100 text-emerald-700' :
                        isPhaseActive ? c.badge : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isPhaseComplete ? 'Complete' : isPhaseActive ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className={`text-xs ${isPhaseActive ? 'text-slate-600' : 'text-slate-400'}`}>{phase.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-bold ${isPhaseActive ? c.text : 'text-slate-400'}`}>{phaseProgress}%</span>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isPhaseComplete ? 'bg-emerald-500' : isPhaseActive ? c.bg : 'bg-slate-200'}`} style={{ width: `${phaseProgress}%` }} />
                    </div>
                  </div>
                  {isExpanded ? <FaChevronDown size={12} className="text-slate-400" /> : <FaChevronRight size={12} className="text-slate-400" />}
                </div>
              </button>

              {/* Phase Steps (Expanded) */}
              {isExpanded && (
                <div className={`px-6 pb-4 ${c.light}`}>
                  <div className="ml-5 border-l-2 border-slate-200 pl-6 space-y-0">
                    {phase.steps.map((step) => {
                      const status = getStepStatus(step.step, currentStep);
                      return (
                        <div key={step.step} className={`relative py-2.5 ${status === 'active' ? 'animate-fade-in' : ''}`}>
                          {/* Connector dot */}
                          <div className={`absolute -left-7.75 top-3.5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                            status === 'completed' ? 'bg-emerald-500 border-emerald-500 shadow-xs' :
                            status === 'active' ? `${c.bg} border-white ring-2 ring-emerald-400 shadow-sm animate-pulse` :
                            'bg-white border-slate-300'
                          }`}>
                            {status === 'completed' && <FaCheck className="text-white" style={{ fontSize: 7, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
                            {status === 'active' && <FaSpinner className="text-white animate-spin" style={{ fontSize: 7, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
                          </div>
                          {/* Step content */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-medium ${
                                status === 'completed' ? 'text-slate-600' :
                                status === 'active' ? c.text + ' font-semibold' :
                                'text-slate-400'
                              }`}>
                                <span className="text-xs font-mono mr-2 opacity-50">#{step.step}</span>
                                {step.title}
                              </p>
                              <p className={`text-xs mt-0.5 ${status === 'active' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Actor: {step.actor}
                              </p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'active' ? c.badge : 'bg-slate-100 text-slate-400'
                            }`}>
                              {status === 'completed' ? 'Done' : status === 'active' ? 'Current' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PHASES };
