export default function FormField({ label, required, hint, error, children }) {
  return (
    <div className="flex flex-col">
      <label className="block text-[13px] font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] font-medium text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, readOnly, type = 'text', ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-4 py-2.5 border rounded-xl text-sm transition-all duration-200 outline-none ${
        readOnly 
          ? 'bg-slate-50/70 border-slate-200/60 text-slate-500 cursor-not-allowed select-none' 
          : 'bg-white border-slate-200/80 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm'
      }`}
      {...props}
    />
  );
}

export function SelectInput({ value, onChange, options, placeholder, disabled, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-2.5 border border-slate-200/80 rounded-xl text-sm text-slate-800 bg-white hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all duration-200 outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-size-[10px_10px] bg-no-repeat bg-position-[right_1rem_center] pr-10 ${
        disabled ? 'bg-slate-50/70 border-slate-200/60 text-slate-500 cursor-not-allowed select-none' : ''
      }`}
      {...props}
    >
      {placeholder && <option value="" disabled className="text-slate-400">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all duration-200 outline-none resize-y min-h-25"
    />
  );
}
