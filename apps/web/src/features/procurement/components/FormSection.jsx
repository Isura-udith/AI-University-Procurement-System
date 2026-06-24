export default function FormSection({ title, subtitle, icon: Icon, children, step }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="bg-linear-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex items-center space-x-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-sm ring-2 ring-emerald-500/20">
          {step || (Icon && <Icon size={16} />)}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[12px] font-medium text-slate-500 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 md:p-8 space-y-7 bg-white">{children}</div>
    </div>
  );
}
